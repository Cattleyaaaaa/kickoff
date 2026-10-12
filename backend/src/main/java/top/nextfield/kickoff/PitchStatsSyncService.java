package top.nextfield.kickoff;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Builds a compact, reviewable season aggregate. No raw provider response is written. */
@Service
public class PitchStatsSyncService {
    private static final String BASE = "https://api.pitchapi.dev/v1";
    private static final List<LeagueTarget> LEAGUES = List.of(
            new LeagueTarget("英超", Pattern.compile("^(English )?Premier League$", Pattern.CASE_INSENSITIVE), "ENG"),
            new LeagueTarget("西甲", Pattern.compile("^(La ?Liga|Primera Divisi[oó]n)$", Pattern.CASE_INSENSITIVE), "ESP"),
            new LeagueTarget("意甲", Pattern.compile("^Serie A$", Pattern.CASE_INSENSITIVE), "ITA"),
            new LeagueTarget("德甲", Pattern.compile("^(?:1\\.\\s*)?Bundesliga$", Pattern.CASE_INSENSITIVE), "GER"),
            new LeagueTarget("法甲", Pattern.compile("^Ligue 1$", Pattern.CASE_INSENSITIVE), "FRA"),
            new LeagueTarget("欧冠", Pattern.compile("^(UEFA )?Champions League$", Pattern.CASE_INSENSITIVE), null));

    private final String key;
    private final Path output;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();
    private Instant lastRequest = Instant.EPOCH;
    private int requestCount;

    public PitchStatsSyncService(
            @Value("${PITCHAPI_KEY:}") String key,
            @Value("${KICKOFF_ADVANCED_OUTPUT:../public/data/advanced.json}") String output) {
        this.key = key.trim();
        this.output = Path.of(output);
    }

    public void synchronize() throws IOException, InterruptedException {
        if (key.isBlank()) throw new IllegalStateException("PITCHAPI_KEY is not configured.");
        LocalDate today = LocalDate.now();
        int year = today.getMonthValue() >= 7 ? today.getYear() : today.getYear() - 1;
        String season = year + "/" + (year + 1);
        JsonNode catalogue = get("/leagues");
        JsonNode leagues = catalogue.path("leagues");
        if (!leagues.isArray()) throw new IOException("PitchAPI league catalogue has no leagues array.");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("source", "pitchapi.dev");
        result.put("schemaVersion", 1);
        result.put("updatedAt", Instant.now().toString());
        result.put("season", season);
        Map<String, Object> leagueResults = new LinkedHashMap<>();
        result.put("leagues", leagueResults);

        for (LeagueTarget target : LEAGUES) {
            String id = findLeague(leagues, target, season);
            if (id == null) throw new IOException(target.label + ": " + season + " not listed in PitchAPI catalogue.");
            JsonNode payload = get("/leagues/" + id + "/matches?season=" + encode(season));
            JsonNode matches = payload.path("matches");
            if (!matches.isArray()) throw new IOException(target.label + ": match list is unavailable.");
            Map<String, TeamAggregate> teams = new LinkedHashMap<>();
            Map<String, PlayerAggregate> players = new LinkedHashMap<>();
            int finished = 0, teamCovered = 0, playerCovered = 0, advancedTeamCovered = 0, advancedPlayerCovered = 0;
            for (JsonNode match : matches) {
                if (!"finished".equals(string(match.path("status"))) || !match.path("score_home").isNumber()
                        || !match.path("score_away").isNumber()) continue;
                String matchId = string(match.path("id"));
                String homeId = string(match.path("home_team").path("id"));
                String awayId = string(match.path("away_team").path("id"));
                if (matchId == null || homeId == null || awayId == null) continue;
                finished++;
                TeamAggregate home = teams.computeIfAbsent(homeId,
                        value -> new TeamAggregate(value, string(match.path("home_team").path("name"))));
                TeamAggregate away = teams.computeIfAbsent(awayId,
                        value -> new TeamAggregate(value, string(match.path("away_team").path("name"))));
                home.recordScore(match.path("score_home").asInt(), match.path("score_away").asInt());
                away.recordScore(match.path("score_away").asInt(), match.path("score_home").asInt());

                JsonNode teamStats = optional("/matches/" + matchId + "/stats");
                if (teamStats != null && hasAllPeriod(teamStats)) {
                    recordTeamStats(teamStats, home, away);
                    teamCovered++;
                }
                JsonNode advancedTeams = optional("/matches/" + matchId + "/advanced");
                if (advancedTeams != null && advancedTeams.path("teams").isArray()
                        && advancedTeams.path("teams").size() >= 2) {
                    for (JsonNode row : advancedTeams.path("teams")) {
                        TeamAggregate team = teams.get(string(row.path("team").path("id")));
                        if (team != null) team.recordAdvanced(row);
                    }
                    advancedTeamCovered++;
                }
                JsonNode playerStats = optional("/matches/" + matchId + "/players");
                if (playerStats != null && playerStats.isArray() && !playerStats.isEmpty()) {
                    for (JsonNode row : playerStats) recordPlayer(matchId, row, players, teams);
                    playerCovered++;
                }
                JsonNode advancedPlayers = optional("/matches/" + matchId + "/advanced/players");
                JsonNode advancedRows = advancedPlayers == null ? null
                        : advancedPlayers.isArray() ? advancedPlayers : advancedPlayers.path("players");
                if (advancedRows != null && advancedRows.isArray() && !advancedRows.isEmpty()) {
                    for (JsonNode row : advancedRows) recordAdvancedPlayer(matchId, row, players, teams);
                    advancedPlayerCovered++;
                }
            }
            if (finished == 0) throw new IOException(target.label + ": no finished match in " + season + ".");
            List<Map<String, Object>> teamRows = teams.values().stream().map(TeamAggregate::toMap)
                    .sorted(Comparator.comparing(row -> String.valueOf(row.get("name")))).toList();
            List<Map<String, Object>> playerRows = players.values().stream().map(PlayerAggregate::toMap)
                    .sorted(Comparator.comparing(row -> String.valueOf(row.get("name")))).toList();
            if (teamRows.isEmpty() || playerRows.isEmpty())
                throw new IOException(target.label + ": provider returned no team or player rows; previous preview preserved.");
            for (TeamAggregate team : teams.values()) team.validate(target.label);
            for (PlayerAggregate player : players.values()) player.validate(target.label);
            Map<String, Object> league = new LinkedHashMap<>();
            league.put("season", season);
            league.put("finishedMatches", finished);
            league.put("teamStatsMatches", teamCovered);
            league.put("playerStatsMatches", playerCovered);
            league.put("advancedTeamMatches", advancedTeamCovered);
            league.put("advancedPlayerMatches", advancedPlayerCovered);
            league.put("teams", teamRows);
            league.put("players", playerRows);
            leagueResults.put(target.label, league);
            System.out.printf("%s: %d finished; team %d/%d, player %d/%d, advanced team %d/%d, advanced player %d/%d%n",
                    target.label, finished, teamCovered, finished, playerCovered, finished,
                    advancedTeamCovered, finished, advancedPlayerCovered, finished);
        }
        result.put("requestCount", requestCount);
        Files.createDirectories(output.toAbsolutePath().getParent());
        Path temporary = Files.createTempFile(output.toAbsolutePath().getParent(), "pitch-preview-", ".json");
        try {
            Files.writeString(temporary, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
            try { Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temporary); }
        System.out.println("PitchAPI preview saved to " + output.toAbsolutePath() + " after " + requestCount + " requests.");
    }

    private String findLeague(JsonNode leagues, LeagueTarget target, String season) {
        for (JsonNode league : leagues) {
            String name = string(league.path("name"));
            String country = string(league.path("country_code"));
            if (name == null || !target.name.matcher(name).matches() || target.country != null
                    && country != null && !target.country.equals(country)) continue;
            for (JsonNode value : league.path("seasons"))
                if (season.equals(string(value))) return string(league.path("id"));
        }
        return null;
    }

    private void recordTeamStats(JsonNode payload, TeamAggregate home, TeamAggregate away) {
        for (JsonNode period : payload.path("periods")) {
            if (!"All".equals(string(period.path("period")))) continue;
            Set<String> homeKeys = new HashSet<>();
            Set<String> awayKeys = new HashSet<>();
            for (JsonNode group : period.path("groups")) for (JsonNode item : group.path("items")) {
                String key = string(item.path("key"));
                if (key == null) continue;
                Double homeValue = numberPrefix(item.path("home"));
                Double awayValue = numberPrefix(item.path("away"));
                if (homeValue != null && homeKeys.add(key)) home.recordBasic(key, homeValue);
                if (awayValue != null && awayKeys.add(key)) away.recordBasic(key, awayValue);
            }
        }
    }

    private boolean hasAllPeriod(JsonNode payload) {
        for (JsonNode period : payload.path("periods"))
            if ("All".equals(string(period.path("period"))) && period.path("groups").isArray()
                    && !period.path("groups").isEmpty()) return true;
        return false;
    }

    private void recordPlayer(String matchId, JsonNode row, Map<String, PlayerAggregate> players, Map<String, TeamAggregate> teams) {
        String id = string(row.path("player").path("id"));
        String teamId = string(row.path("team_id"));
        if (id == null || teamId == null || !teams.containsKey(teamId)) return;
        PlayerAggregate player = players.computeIfAbsent(id,
                value -> new PlayerAggregate(value, string(row.path("player").path("name"))));
        player.teamId = teamId;
        player.teamName = teams.get(teamId).name;
        player.appearanceMatches.add(matchId);
        int positionId = row.path("player").path("position_id").asInt(0);
        if (positionId > 0) player.position = position(positionId);
        for (JsonNode group : row.path("stats")) for (var entry : group.path("stats").properties()) {
            JsonNode item = entry.getValue();
            String key = string(item.path("key"));
            JsonNode stat = item.path("stat");
            if (key != null && stat.path("value").isNumber()) player.recordBasic(key, stat.path("value").asDouble());
        }
    }

    private void recordAdvancedPlayer(String matchId, JsonNode row, Map<String, PlayerAggregate> players, Map<String, TeamAggregate> teams) {
        String id = string(row.path("player").path("id"));
        String teamId = string(row.path("team_id"));
        if (id == null || teamId == null || !teams.containsKey(teamId)) return;
        PlayerAggregate player = players.computeIfAbsent(id,
                value -> new PlayerAggregate(value, string(row.path("player").path("name"))));
        player.teamId = teamId;
        player.teamName = teams.get(teamId).name;
        player.appearanceMatches.add(matchId);
        player.recordAdvanced(row);
    }

    private JsonNode optional(String path) throws InterruptedException {
        try { return get(path); }
        catch (IOException error) {
            if (error.getMessage().contains("HTTP 401") || error.getMessage().contains("HTTP 403")
                    || error.getMessage().contains("safety limit")) throw new IllegalStateException(error);
            System.out.println("PitchAPI metric unavailable: " + path + " (" + error.getMessage() + ")");
            return null;
        }
    }

    private JsonNode get(String path) throws IOException, InterruptedException {
        for (int attempt = 0; attempt < 3; attempt++) {
            long delay = 150 - Duration.between(lastRequest, Instant.now()).toMillis();
            if (delay > 0) Thread.sleep(delay);
            if (++requestCount > 12000) throw new IOException("PitchAPI safety limit of 12000 requests reached.");
            HttpRequest request = HttpRequest.newBuilder(URI.create(BASE + path)).timeout(Duration.ofSeconds(30))
                    .header("X-API-KEY", key).GET().build();
            lastRequest = Instant.now();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 429 || response.statusCode() >= 500) {
                if (attempt < 2) {
                    long wait = response.headers().firstValue("Retry-After").map(PitchStatsSyncService::retrySeconds).orElse(2L);
                    Thread.sleep(Math.max(1, Math.min(wait, 30)) * 1000);
                    continue;
                }
            }
            JsonNode body = mapper.readTree(response.body());
            if (response.statusCode() != 200 || body.path("error").isObject() || body.path("data").isMissingNode())
                throw new IOException(path + ": HTTP " + response.statusCode() + " " + body.path("error").path("code").asText(""));
            return body.path("data");
        }
        throw new IOException(path + ": request failed after retries.");
    }

    private static long retrySeconds(String value) {
        try { return Long.parseLong(value); } catch (NumberFormatException ignored) { return 2; }
    }
    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private static String string(JsonNode node) { return node.isTextual() && !node.asText().isBlank() ? node.asText() : null; }
    private static Double numberPrefix(JsonNode node) {
        if (node.isNumber()) return node.asDouble();
        if (!node.isTextual()) return null;
        var matcher = Pattern.compile("^-?\\d+(?:\\.\\d+)?").matcher(node.asText());
        return matcher.find() ? Double.parseDouble(matcher.group()) : null;
    }
    private static String position(int id) {
        return switch (id) { case 1 -> "GK"; case 2 -> "DF"; case 3 -> "MF"; case 4 -> "FW"; default -> null; };
    }
    private record LeagueTarget(String label, Pattern name, String country) {}

    private static class Aggregate {
        final Map<String, Double> totals = new LinkedHashMap<>();
        final Map<String, Integer> counts = new LinkedHashMap<>();
        void add(String key, Double value) {
            if (value == null || !Double.isFinite(value) || value < 0) return;
            totals.merge(key, value, Double::sum);
            counts.merge(key, 1, Integer::sum);
        }
        void addPath(String key, JsonNode row, String group, String field) {
            JsonNode value = row.path(group).path(field);
            if (value.isNumber()) add(key, value.asDouble());
        }
        Map<String, Object> values() {
            Map<String, Object> values = new LinkedHashMap<>();
            for (var entry : totals.entrySet()) values.put(entry.getKey(), Math.round(entry.getValue() * 10.0) / 10.0);
            return values;
        }
        void validate(String league) throws IOException {
            checkPair(league, "passesCompleted", "passes");
            checkPair(league, "shotsOnTarget", "shots");
            checkPair(league, "dribblesCompleted", "dribblesAttempted");
        }
        private void checkPair(String league, String numerator, String denominator) throws IOException {
            Double a = totals.get(numerator), b = totals.get(denominator);
            if (a != null && b != null && a > b)
                throw new IOException(league + ": inconsistent " + numerator + "=" + a + " > " + denominator + "=" + b);
        }
    }

    private static final class TeamAggregate extends Aggregate {
        final String id;
        final String name;
        int games;
        double possessionTotal;
        int possessionCount;
        TeamAggregate(String id, String name) { this.id = id; this.name = name == null ? id : name; }
        void recordScore(int goals, int conceded) { games++; add("goals", (double) goals); add("goalsAgainst", (double) conceded); if (conceded == 0) add("cleanSheets", 1.0); }
        void recordBasic(String key, Double value) {
            String mapped = switch (key) {
                case "total_shots" -> "shots"; case "ShotsOnTarget" -> "shotsOnTarget";
                case "accurate_passes" -> "passesCompleted"; case "passes" -> "passes";
                case "Offsides" -> "offsides"; case "fouls" -> "fouls";
                case "yellow_cards" -> "yellowCards"; case "red_cards" -> "redCards";
                case "keeper_saves" -> "saves";
                default -> null;
            };
            if (mapped != null) add(mapped, value);
        }
        void recordAdvanced(JsonNode row) {
            addPath("keyPasses", row, "passing", "key_passes");
            addPath("dribblesAttempted", row, "carrying", "take_ons");
            addPath("dribblesCompleted", row, "carrying", "take_ons_won");
            addPath("tackles", row, "defending", "tackles");
            addPath("interceptions", row, "defending", "interceptions");
            addPath("clearances", row, "defending", "clearances");
            JsonNode possession = row.path("territory").path("possession_pct");
            if (possession.isNumber()) { possessionTotal += possession.asDouble(); possessionCount++; }
        }
        Map<String, Object> toMap() {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", id); row.put("name", name); row.put("games", games);
            Map<String, Object> stats = values();
            if (possessionCount > 0) stats.put("possession", Math.round(possessionTotal / possessionCount * 10.0) / 10.0);
            if (totals.containsKey("shots") && counts.getOrDefault("shots", 0) > 0)
                stats.put("shotsPerGame", Math.round(totals.get("shots") / counts.get("shots") * 10.0) / 10.0);
            row.put("values", stats);
            return row;
        }
    }

    private static final class PlayerAggregate extends Aggregate {
        final String id;
        final String name;
        String teamId;
        String teamName;
        String position;
        final Set<String> appearanceMatches = new HashSet<>();
        PlayerAggregate(String id, String name) { this.id = id; this.name = name == null ? id : name; }
        void recordBasic(String key, Double value) {
            String mapped = switch (key) {
                case "goals" -> "goals"; case "assists" -> "assists"; case "total_shots" -> "shots";
                case "ShotsOnTarget" -> "shotsOnTarget"; case "accurate_passes" -> "passesCompleted";
                case "Offsides" -> "offsides"; case "fouls" -> "fouls";
                case "yellow_cards" -> "yellowCards"; case "red_cards" -> "redCards";
                case "saves" -> "saves";
                default -> null;
            };
            if (mapped != null) add(mapped, value);
        }
        void recordAdvanced(JsonNode row) {
            addPath("passes", row, "passing", "passes");
            addPath("keyPasses", row, "passing", "key_passes");
            addPath("dribblesAttempted", row, "carrying", "take_ons");
            addPath("dribblesCompleted", row, "carrying", "take_ons_won");
            addPath("tackles", row, "defending", "tackles");
            addPath("interceptions", row, "defending", "interceptions");
            addPath("clearances", row, "defending", "clearances");
        }
        Map<String, Object> toMap() {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", id); row.put("name", name); row.put("team", teamName);
            row.put("position", position); row.put("appearances", appearanceMatches.size());
            Map<String, Object> stats = values(); stats.put("appearances", appearanceMatches.size());
            row.put("values", stats); return row;
        }
    }
}
