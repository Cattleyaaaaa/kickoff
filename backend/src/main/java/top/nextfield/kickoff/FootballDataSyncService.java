package top.nextfield.kickoff;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class FootballDataSyncService {
    private static final List<Competition> COMPETITIONS = List.of(
            new Competition("PL", "英超"), new Competition("PD", "西甲"),
            new Competition("SA", "意甲"), new Competition("BL1", "德甲"),
            new Competition("FL1", "法甲"), new Competition("CL", "欧冠"));
    private static final Map<String, TeamStyle> KNOWN_TEAMS = Map.of(
            "Arsenal FC", new TeamStyle("阿森纳", "ARS", "#e34448"),
            "Liverpool FC", new TeamStyle("利物浦", "LIV", "#c93640"),
            "Manchester City FC", new TeamStyle("曼城", "MCI", "#54a8dc"),
            "Real Madrid CF", new TeamStyle("皇家马德里", "RMA", "#d6b652"),
            "FC Barcelona", new TeamStyle("巴塞罗那", "BAR", "#783e99"),
            "FC Bayern München", new TeamStyle("拜仁慕尼黑", "FCB", "#d64545"),
            "Paris Saint-Germain FC", new TeamStyle("巴黎圣日耳曼", "PSG", "#4b67b2"),
            "FC Internazionale Milano", new TeamStyle("国际米兰", "INT", "#3279bd"));

    private final String apiKey;
    private final Path output;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
    private final Clock clock = Clock.systemUTC();
    private Instant lastRequest = Instant.EPOCH;

    public FootballDataSyncService(
            @Value("${FOOTBALL_DATA_API_KEY:}") String apiKey,
            @Value("${KICKOFF_SNAPSHOT_DIR:public/data}") String snapshotDirectory) {
        this.apiKey = apiKey.trim();
        this.output = Path.of(snapshotDirectory).resolve("football.json");
    }

    public void synchronize() throws IOException, InterruptedException {
        if (apiKey.isBlank()) throw new IllegalStateException("FOOTBALL_DATA_API_KEY is not configured.");

        LocalDate today = LocalDate.now(clock);
        LocalDate from = today.minusDays(8);
        List<Map<String, Object>> matches = new ArrayList<>();
        List<Map<String, Object>> fixtures = new ArrayList<>();
        Map<String, Object> standings = new LinkedHashMap<>();

        for (Competition competition : COMPETITIONS) {
            JsonNode recentPayload = get("/competitions/" + competition.code + "/matches?dateFrom=" + from + "&dateTo=" + today, false);
            matches.addAll(normalizeMatches(recentPayload, competition.name));

            JsonNode standingsPayload = get("/competitions/" + competition.code + "/standings", competition.code.equals("CL"));
            Map<String, Object> table = standingsPayload == null
                    ? emptyStandings()
                    : normalizeStandings(standingsPayload, competition.name);
            standings.put(competition.name, table);

            String seasonFrom = text(path(standingsPayload, "season", "startDate"), "");
            String seasonTo = text(path(standingsPayload, "season", "endDate"), "");
            if (seasonFrom.isBlank() || seasonTo.isBlank()) {
                int startYear = today.getMonthValue() >= 7 ? today.getYear() : today.getYear() - 1;
                seasonFrom = startYear + "-07-01";
                seasonTo = (startYear + 1) + "-06-30";
            }
            JsonNode fixturePayload = get("/competitions/" + competition.code + "/matches?dateFrom=" + seasonFrom + "&dateTo=" + seasonTo, false);
            fixtures.addAll(normalizeFixtures(fixturePayload, competition.name));
            System.out.printf("%s: %d season matches, %d standings groups%n", competition.name,
                    fixtures.stream().filter(fixture -> competition.name.equals(fixture.get("league"))).count(),
                    ((List<?>) table.get("groups")).size());
        }

        matches.sort(Comparator.comparing(match -> String.valueOf(match.get("utcDate")), Comparator.reverseOrder()));
        fixtures.sort(Comparator.comparing(match -> String.valueOf(match.get("utcDate"))));
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("source", "football-data.org");
        snapshot.put("updatedAt", clock.instant().toString());
        snapshot.put("range", Map.of("from", from.toString(), "to", today.toString()));
        snapshot.put("matches", matches);
        snapshot.put("fixtures", fixtures);
        snapshot.put("standings", standings);

        Files.createDirectories(output.toAbsolutePath().getParent());
        Path temporary = output.resolveSibling(output.getFileName() + ".tmp");
        Files.writeString(temporary, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(snapshot) + "\n", StandardCharsets.UTF_8);
        try {
            Files.move(temporary, output, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException exception) {
            Files.move(temporary, output, StandardCopyOption.REPLACE_EXISTING);
        }
        System.out.printf("Saved %d results to %s%n", matches.size(), output.toAbsolutePath());
    }

    private JsonNode get(String path, boolean allowNotFound) throws IOException, InterruptedException {
        for (int attempt = 0; attempt < 2; attempt++) {
            long waitMillis = 6_500 - Duration.between(lastRequest, clock.instant()).toMillis();
            if (waitMillis > 0) TimeUnit.MILLISECONDS.sleep(waitMillis);
            lastRequest = clock.instant();
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.football-data.org/v4" + path))
                    .timeout(Duration.ofSeconds(30)).header("X-Auth-Token", apiKey).GET().build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 404 && allowNotFound) return null;
            if (response.statusCode() == 429 && attempt == 0) {
                long retry = response.headers().firstValue("Retry-After").map(value -> {
                    try { return Math.max(1, Long.parseLong(value)); }
                    catch (NumberFormatException ignored) { return 65L; }
                }).orElse(65L);
                TimeUnit.SECONDS.sleep(retry);
                continue;
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300)
                throw new IOException(path + ": HTTP " + response.statusCode() + " " + response.body());
            return mapper.readTree(response.body());
        }
        throw new IOException(path + ": exhausted rate limit retries");
    }

    private List<Map<String, Object>> normalizeMatches(JsonNode payload, String league) {
        JsonNode rows = payload.path("matches");
        if (!rows.isArray()) throw new IllegalStateException(league + ": matches response is missing.");
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode match : rows) {
            JsonNode score = match.path("score");
            JsonNode fullTime = score.path("fullTime");
            if (!"FINISHED".equals(text(match.path("status"), "")) || !isInteger(fullTime.path("home")) || !isInteger(fullTime.path("away"))) continue;
            TeamStyle home = teamStyle(match.path("homeTeam"));
            TeamStyle away = teamStyle(match.path("awayTeam"));
            int homeScore = fullTime.path("home").intValue();
            int awayScore = fullTime.path("away").intValue();
            JsonNode penalties = score.path("penalties");
            boolean shootout = "PENALTY_SHOOTOUT".equals(text(score.path("duration"), ""))
                    && isInteger(penalties.path("home")) && isInteger(penalties.path("away"))
                    && homeScore >= penalties.path("home").intValue() && awayScore >= penalties.path("away").intValue();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", text(match.path("id"), "")); item.put("league", league); item.put("utcDate", text(match.path("utcDate"), ""));
            item.put("home", home.name); item.put("away", away.name);
            item.put("hs", shootout ? homeScore - penalties.path("home").intValue() : homeScore);
            item.put("as", shootout ? awayScore - penalties.path("away").intValue() : awayScore);
            if (shootout) item.put("penalties", Map.of("home", penalties.path("home").intValue(), "away", penalties.path("away").intValue()));
            item.put("teamHome", home.code); item.put("teamAway", away.code); item.put("colors", List.of(home.color, away.color));
            result.add(item);
        }
        return result;
    }

    private List<Map<String, Object>> normalizeFixtures(JsonNode payload, String league) {
        JsonNode rows = payload.path("matches");
        if (!rows.isArray()) throw new IllegalStateException(league + ": fixtures response is missing.");
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode match : rows) {
            String status = text(match.path("status"), "");
            if (text(match.path("utcDate"), "").isBlank() || text(path(match, "homeTeam", "name"), "").isBlank()
                    || text(path(match, "awayTeam", "name"), "").isBlank() || List.of("CANCELLED", "ABANDONED").contains(status)) continue;
            TeamStyle home = teamStyle(match.path("homeTeam")); TeamStyle away = teamStyle(match.path("awayTeam"));
            JsonNode fullTime = match.path("score").path("fullTime");
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", text(match.path("id"), "")); item.put("league", league); item.put("utcDate", text(match.path("utcDate"), ""));
            item.put("home", home.name); item.put("away", away.name); item.put("teamHome", home.code); item.put("teamAway", away.code);
            item.put("colors", List.of(home.color, away.color)); item.put("status", status);
            item.put("hs", isInteger(fullTime.path("home")) ? fullTime.path("home").intValue() : null);
            item.put("as", isInteger(fullTime.path("away")) ? fullTime.path("away").intValue() : null);
            result.add(item);
        }
        return result;
    }

    private Map<String, Object> normalizeStandings(JsonNode payload, String league) {
        JsonNode groups = payload.path("standings");
        if (!groups.isArray()) throw new IllegalStateException(league + ": standings response is missing.");
        List<Map<String, Object>> normalizedGroups = new ArrayList<>();
        for (JsonNode group : groups) {
            if (!"TOTAL".equals(text(group.path("type"), ""))) continue;
            List<Map<String, Object>> rows = new ArrayList<>();
            for (JsonNode row : group.path("table")) {
                JsonNode team = row.path("team"); TeamStyle style = teamStyle(team);
                int gd = row.path("goalDifference").asInt(0);
                Map<String, Object> normalized = new LinkedHashMap<>();
                normalized.put("id", isInteger(team.path("id")) ? team.path("id").intValue() : null);
                normalized.put("sourceName", text(team.path("name"), style.name)); normalized.put("code", style.code);
                normalized.put("pos", row.path("position").asInt()); normalized.put("team", style.name); normalized.put("color", style.color);
                normalized.put("pts", row.path("points").asInt()); normalized.put("p", row.path("playedGames").asInt());
                normalized.put("w", row.path("won").asInt()); normalized.put("d", row.path("draw").asInt()); normalized.put("l", row.path("lost").asInt());
                normalized.put("gd", gd > 0 ? "+" + gd : String.valueOf(gd));
                normalized.put("gf", isInteger(row.path("goalsFor")) ? row.path("goalsFor").intValue() : null);
                normalized.put("ga", isInteger(row.path("goalsAgainst")) ? row.path("goalsAgainst").intValue() : null);
                rows.add(normalized);
            }
            if (!rows.isEmpty()) normalizedGroups.add(Map.of("name", text(group.path("group"), ""), "rows", rows));
        }
        String seasonStart = text(path(payload, "season", "startDate"), "");
        String seasonEnd = text(path(payload, "season", "endDate"), "");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("season", !seasonStart.isBlank() && !seasonEnd.isBlank() ? seasonStart.substring(0, 4) + " / " + seasonEnd.substring(2, 4) : "");
        if (!seasonStart.isBlank()) result.put("startDate", seasonStart);
        if (!seasonEnd.isBlank()) result.put("endDate", seasonEnd);
        result.put("groups", normalizedGroups);
        return result;
    }

    private static Map<String, Object> emptyStandings() { return Map.of("season", "", "groups", List.of()); }
    private static JsonNode path(JsonNode node, String first, String second) { return node == null ? null : node.path(first).path(second); }
    private static String text(JsonNode node, String fallback) { return node == null || node.isMissingNode() || node.isNull() ? fallback : node.asText(fallback); }
    private static boolean isInteger(JsonNode node) { return node != null && node.isIntegralNumber(); }
    private static TeamStyle teamStyle(JsonNode team) {
        String sourceName = text(team.path("name"), "Unknown team");
        TeamStyle known = KNOWN_TEAMS.get(sourceName);
        if (known != null) return known;
        String shortName = text(team.path("shortName"), "");
        String tla = text(team.path("tla"), "");
        String id = text(team.path("id"), "");
        String code = !tla.isBlank() ? tla : !id.isBlank() ? id.substring(Math.max(0, id.length() - 3)) : "";
        return new TeamStyle(!shortName.isBlank() ? shortName : sourceName, code, "#7377db");
    }

    private record Competition(String code, String name) {}
    private record TeamStyle(String name, String code, String color) {}
}
