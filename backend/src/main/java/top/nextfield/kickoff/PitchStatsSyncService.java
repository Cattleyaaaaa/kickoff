package top.nextfield.kickoff;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
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
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Builds compact season aggregates and normalized per-match facts. No raw provider response is written. */
@Service
public class PitchStatsSyncService {
    private static final Logger log = LoggerFactory.getLogger(PitchStatsSyncService.class);
    private static final List<LeagueTarget> LEAGUES = List.of(
            new LeagueTarget("英超", Pattern.compile("^(English )?Premier League$", Pattern.CASE_INSENSITIVE), "ENG"),
            new LeagueTarget("西甲", Pattern.compile("^(La ?Liga|Primera Divisi[oó]n)$", Pattern.CASE_INSENSITIVE), "ESP"),
            new LeagueTarget("意甲", Pattern.compile("^Serie A$", Pattern.CASE_INSENSITIVE), "ITA"),
            new LeagueTarget("德甲", Pattern.compile("^(?:1\\.\\s*)?Bundesliga$", Pattern.CASE_INSENSITIVE), "GER"),
            new LeagueTarget("法甲", Pattern.compile("^Ligue 1$", Pattern.CASE_INSENSITIVE), "FRA"),
            new LeagueTarget("欧冠", Pattern.compile("^(UEFA )?Champions League$", Pattern.CASE_INSENSITIVE), null));

    private final String key;
    private final Path output;
    private final String baseUrl;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final HttpClient http;
    private Instant lastRequest = Instant.EPOCH;
    private int requestCount;

    public PitchStatsSyncService(
            @Value("${PITCHAPI_KEY:}") String key,
            @Value("${KICKOFF_ADVANCED_OUTPUT:../public/data/advanced.json}") String output,
            @Value("${PITCHAPI_BASE_URL:https://api.pitchapi.dev/v1}") String baseUrl,
            @Value("${kickoff.news.proxy:}") String proxySetting) {
        this.key = key.trim();
        this.output = Path.of(output);
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        HttpClient.Builder client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20));
        URI proxy = parseProxy(proxySetting);
        if (proxy != null) {
            int port = proxy.getPort() > 0 ? proxy.getPort()
                    : ("https".equalsIgnoreCase(proxy.getScheme()) ? 443 : 80);
            client.proxy(ProxySelector.of(new InetSocketAddress(proxy.getHost(), port)));
            log.info("PitchAPI requests will use configured HTTPS proxy {}:{}", proxy.getHost(), port);
        }
        this.http = client.build();
    }

    private URI parseProxy(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            URI proxy = URI.create(value.trim());
            if (proxy.getHost() == null || !("http".equalsIgnoreCase(proxy.getScheme())
                    || "https".equalsIgnoreCase(proxy.getScheme()))) {
                log.warn("Ignoring invalid HTTPS_PROXY value; expected an http(s) proxy URL.");
                return null;
            }
            return proxy;
        } catch (IllegalArgumentException exception) {
            log.warn("Ignoring invalid HTTPS_PROXY value; expected an http(s) proxy URL.");
            return null;
        }
    }

    public void synchronize() throws IOException, InterruptedException {
        if (key.isBlank()) throw new IllegalStateException("PITCHAPI_KEY is not configured.");
        requestCount = 0;
        lastRequest = Instant.EPOCH;
        LocalDate today = LocalDate.now();
        int year = today.getMonthValue() >= 7 ? today.getYear() : today.getYear() - 1;
        String season = year + "/" + (year + 1);
        JsonNode catalogue = get("/leagues");
        JsonNode leagues = catalogue.path("leagues");
        if (!leagues.isArray()) throw new IOException("PitchAPI league catalogue has no leagues array.");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("source", "pitchapi.dev");
        result.put("schemaVersion", 1);
        result.put("season", season);
        Map<String, Object> leagueResults = new LinkedHashMap<>();
        result.put("leagues", leagueResults);
        Map<String, List<Map<String, Object>>> matchResults = new LinkedHashMap<>();

        for (LeagueTarget target : LEAGUES) {
            String id = findLeague(leagues, target, season);
            if (id == null) throw new IOException(target.label + ": " + season + " not listed in PitchAPI catalogue.");
            JsonNode payload = get("/leagues/" + id + "/matches?season=" + encode(season));
            JsonNode matches = payload.path("matches");
            if (!matches.isArray()) throw new IOException(target.label + ": match list is unavailable.");
            Map<String, TeamAggregate> teams = new LinkedHashMap<>();
            Map<String, PlayerAggregate> players = new LinkedHashMap<>();
            List<Map<String, Object>> matchRows = new ArrayList<>();
            int finished = 0, teamCovered = 0, playerCovered = 0, advancedTeamCovered = 0, advancedPlayerCovered = 0, cardEventsCovered = 0;
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
                JsonNode advancedHome = null, advancedAway = null;
                if (advancedTeams != null && advancedTeams.path("teams").isArray()
                        && advancedTeams.path("teams").size() >= 2) {
                    for (JsonNode row : advancedTeams.path("teams")) {
                        String teamId = string(row.path("team").path("id"));
                        TeamAggregate team = teams.get(teamId);
                        if (homeId.equals(teamId)) advancedHome = row;
                        if (awayId.equals(teamId)) advancedAway = row;
                        if (team != null) team.recordAdvanced(row);
                    }
                    advancedTeamCovered++;
                }
                Map<String, Object> matchRow = new LinkedHashMap<>();
                matchRow.put("id", matchId);
                matchRow.put("date", string(match.path("time_utc")) != null
                        ? string(match.path("time_utc")) : string(match.path("date")));
                matchRow.put("league", target.label);
                matchRow.put("home", home.name);
                matchRow.put("away", away.name);
                matchRow.put("scoreHome", match.path("score_home").asInt());
                matchRow.put("scoreAway", match.path("score_away").asInt());
                matchRow.put("homeStats", matchTeamValues(teamStats, advancedHome, "home"));
                matchRow.put("awayStats", matchTeamValues(teamStats, advancedAway, "away"));
                matchRow.put("teamStatsVerified", teamStats != null && hasAllPeriod(teamStats));
                matchRow.put("advancedStatsVerified", advancedHome != null && advancedAway != null);
                matchRows.add(matchRow);
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
                JsonNode events = optional("/matches/" + matchId + "/events");
                if (events != null && events.path("events").isArray()) {
                    recordCardEvents(matchId, events.path("events"), players, teams);
                    recordMatchCardEvents(events.path("events"), matchRow, homeId, awayId);
                    cardEventsCovered++;
                }
            }
            if (finished == 0) throw new IOException(target.label + ": no finished match in " + season + ".");
            if (cardEventsCovered != finished)
                throw new IOException(target.label + ": card events cover " + cardEventsCovered + "/" + finished
                        + " finished matches; previous snapshot preserved.");
            int discardedPairs = teams.values().stream().mapToInt(Aggregate::discardInconsistentPairs).sum()
                    + players.values().stream().mapToInt(Aggregate::discardInconsistentPairs).sum();
            List<Map<String, Object>> teamRows = teams.values().stream().map(TeamAggregate::toMap)
                    .sorted(Comparator.comparing(row -> String.valueOf(row.get("name")))).toList();
            List<Map<String, Object>> playerRows = players.values().stream().map(PlayerAggregate::toMap)
                    .sorted(Comparator.comparing(row -> String.valueOf(row.get("name")))).toList();
            if (teamRows.isEmpty() || playerRows.isEmpty())
                throw new IOException(target.label + ": provider returned no team or player rows; previous preview preserved.");
            Map<String, Object> league = new LinkedHashMap<>();
            league.put("season", season);
            league.put("finishedMatches", finished);
            league.put("teamStatsMatches", teamCovered);
            league.put("playerStatsMatches", playerCovered);
            league.put("advancedTeamMatches", advancedTeamCovered);
            league.put("advancedPlayerMatches", advancedPlayerCovered);
            league.put("cardEventsMatches", cardEventsCovered);
            league.put("discardedInconsistentMetricPairs", discardedPairs);
            league.put("teams", teamRows);
            league.put("players", playerRows);
            leagueResults.put(target.label, league);
            matchResults.put(target.label, matchRows);
            System.out.printf("%s: %d finished; team %d/%d, player %d/%d, advanced team %d/%d, advanced player %d/%d, card events %d/%d, discarded metric pairs %d%n",
                    target.label, finished, teamCovered, finished, playerCovered, finished,
                    advancedTeamCovered, finished, advancedPlayerCovered, finished, cardEventsCovered, finished, discardedPairs);
        }
        result.put("requestCount", requestCount);
        result.put("updatedAt", Instant.now().toString());
        Map<String, Object> matchSnapshot = new LinkedHashMap<>();
        matchSnapshot.put("source", "pitchapi.dev");
        matchSnapshot.put("schemaVersion", 1);
        matchSnapshot.put("season", season);
        matchSnapshot.put("updatedAt", result.get("updatedAt"));
        matchSnapshot.put("requestCount", requestCount);
        matchSnapshot.put("leagues", matchResults);
        Files.createDirectories(output.toAbsolutePath().getParent());
        Path temporary = Files.createTempFile(output.toAbsolutePath().getParent(), "pitch-preview-", ".json");
        try {
            Files.writeString(temporary, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(result));
            try { Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temporary); }
        Path matchOutput = output.resolveSibling("match-stats.json");
        writeSnapshot(matchOutput, matchSnapshot, "pitch-match-stats-");
        System.out.println("Per-match statistics saved to " + matchOutput.toAbsolutePath() + ".");
        System.out.println("PitchAPI preview saved to " + output.toAbsolutePath() + " after " + requestCount + " requests.");
    }

    private void writeSnapshot(Path target, Map<String, Object> value, String prefix) throws IOException {
        Files.createDirectories(target.toAbsolutePath().getParent());
        Path temporary = Files.createTempFile(target.toAbsolutePath().getParent(), prefix, ".json");
        try {
            Files.writeString(temporary, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(value));
            try { Files.move(temporary, target.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary, target.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temporary); }
    }

    private Map<String, Object> matchTeamValues(JsonNode basic, JsonNode advanced, String side) {
        Map<String, Object> values = new LinkedHashMap<>();
        if (basic != null) for (JsonNode period : basic.path("periods")) {
            if (!"All".equals(string(period.path("period")))) continue;
            for (JsonNode group : period.path("groups")) for (JsonNode item : group.path("items")) {
                String key = string(item.path("key"));
                if (key == null) continue;
                String mapped = switch (key) {
                    case "total_shots" -> "shots"; case "ShotsOnTarget" -> "shotsOnTarget";
                    case "fouls" -> "fouls"; case "yellow_cards" -> "yellowCards";
                    case "red_cards" -> "redCards"; case "Offsides" -> "offsides";
                    case "keeper_saves" -> "saves"; default -> null;
                };
                Double value = numberPrefix(item.path(side));
                if (mapped != null && value != null) values.putIfAbsent(mapped, value);
            }
        }
        if (advanced != null) {
            addMatchPath(values, "passes", advanced, "passing", "passes");
            addMatchPath(values, "passAccuracy", advanced, "passing", "pass_accuracy");
            addMatchPath(values, "keyPasses", advanced, "passing", "key_passes");
            addMatchPath(values, "dribblesAttempted", advanced, "carrying", "take_ons");
            addMatchPath(values, "dribblesCompleted", advanced, "carrying", "take_ons_won");
            addMatchPath(values, "tackles", advanced, "defending", "tackles");
            addMatchPath(values, "interceptions", advanced, "defending", "interceptions");
            addMatchPath(values, "clearances", advanced, "defending", "clearances");
            addMatchPath(values, "possession", advanced, "territory", "possession_pct");
        }
        return values;
    }

    private void addMatchPath(Map<String, Object> values, String key, JsonNode node, String... path) {
        JsonNode value = node;
        for (String segment : path) value = value.path(segment);
        if (value.isNumber() && Double.isFinite(value.asDouble()) && value.asDouble() >= 0)
            values.put(key, value.asDouble());
    }

    @SuppressWarnings("unchecked")
    private void recordMatchCardEvents(JsonNode events, Map<String, Object> match, String homeId, String awayId) {
        Map<String, Object> home = (Map<String, Object>) match.get("homeStats");
        Map<String, Object> away = (Map<String, Object>) match.get("awayStats");
        int[] homeCards = new int[2], awayCards = new int[2];
        for (JsonNode event : events) {
            String type = string(event.path("event_type"));
            if (type == null) continue;
            type = type.replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
            int index = type.equals("yellowcard") ? 0 : type.equals("redcard") ? 1 : -1;
            if (index < 0) continue;
            String teamId = string(event.path("team_id"));
            if (homeId.equals(teamId)) homeCards[index]++;
            else if (awayId.equals(teamId)) awayCards[index]++;
        }
        home.putIfAbsent("yellowCards", (double) homeCards[0]);
        home.putIfAbsent("redCards", (double) homeCards[1]);
        away.putIfAbsent("yellowCards", (double) awayCards[0]);
        away.putIfAbsent("redCards", (double) awayCards[1]);
    }

    /** Fills player cards in an existing season snapshot without repeating other match-stat requests. */
    public void synchronizeCards() throws IOException, InterruptedException {
        if (key.isBlank()) throw new IllegalStateException("PITCHAPI_KEY is not configured.");
        if (!Files.isRegularFile(output)) throw new IOException("PitchAPI snapshot does not exist: " + output);
        JsonNode parsed = mapper.readTree(Files.readString(output));
        if (!(parsed instanceof ObjectNode snapshot) || !"pitchapi.dev".equals(string(snapshot.path("source")))
                || snapshot.path("schemaVersion").asInt() != 1) throw new IOException("Invalid PitchAPI snapshot.");
        String season = string(snapshot.path("season"));
        if (season == null) throw new IOException("PitchAPI snapshot has no season.");
        JsonNode catalogue = get("/leagues").path("leagues");
        if (!catalogue.isArray()) throw new IOException("PitchAPI league catalogue has no leagues array.");
        int covered = 0;
        for (LeagueTarget target : LEAGUES) {
            JsonNode league = snapshot.path("leagues").path(target.label);
            JsonNode playerRows = league.path("players");
            if (!playerRows.isArray() || playerRows.isEmpty()) throw new IOException(target.label + ": no saved player rows.");
            Set<String> knownPlayers = new HashSet<>();
            for (JsonNode row : playerRows) {
                String playerId = string(row.path("id"));
                if (playerId == null || !(row.path("values") instanceof ObjectNode))
                    throw new IOException(target.label + ": invalid saved player row.");
                knownPlayers.add(playerId);
            }
            String id = findLeague(catalogue, target, season);
            if (id == null) throw new IOException(target.label + ": season not listed in PitchAPI catalogue.");
            JsonNode matches = get("/leagues/" + id + "/matches?season=" + encode(season)).path("matches");
            if (!matches.isArray()) throw new IOException(target.label + ": match list is unavailable.");
            List<JsonNode> finishedMatches = new ArrayList<>();
            for (JsonNode match : matches) {
                if ("finished".equals(string(match.path("status"))) && match.path("score_home").isNumber()
                        && match.path("score_away").isNumber()) finishedMatches.add(match);
            }
            if (finishedMatches.size() != league.path("finishedMatches").asInt(-1)) {
                System.out.printf("%s: finished match count changed (%d -> %d); refreshing the full statistics snapshot.%n",
                        target.label, league.path("finishedMatches").asInt(-1), finishedMatches.size());
                synchronize();
                return;
            }
            Map<String, int[]> cards = new LinkedHashMap<>();
            for (JsonNode match : finishedMatches) {
                String matchId = string(match.path("id"));
                if (matchId == null) throw new IOException(target.label + ": a finished match has no ID.");
                JsonNode events = get("/matches/" + matchId + "/events").path("events");
                if (!events.isArray()) throw new IOException(target.label + ": card events are unavailable for " + matchId);
                countCardEvents(events, cards);
                for (String playerId : cards.keySet())
                    if (!knownPlayers.contains(playerId)) throw new IOException(target.label + ": card event has no matching saved player: " + playerId);
            }
            for (JsonNode row : playerRows) {
                String playerId = string(row.path("id"));
                ObjectNode values = (ObjectNode) row.path("values");
                int[] total = cards.getOrDefault(playerId, new int[2]);
                values.put("yellowCards", total[0]);
                values.put("redCards", total[1]);
            }
            if (league instanceof ObjectNode leagueObject) {
                leagueObject.put("cardEventsMatches", finishedMatches.size());
                leagueObject.put("cardsUpdatedAt", Instant.now().toString());
            }
            covered += finishedMatches.size();
        }
        Files.createDirectories(output.toAbsolutePath().getParent());
        Path temporary = Files.createTempFile(output.toAbsolutePath().getParent(), "pitch-cards-", ".json");
        try {
            Files.writeString(temporary, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(snapshot));
            try { Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (AtomicMoveNotSupportedException ignored) { Files.move(temporary, output.toAbsolutePath(), StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temporary); }
        System.out.println("PitchAPI cards saved from " + covered + " matches after " + requestCount + " requests.");
    }

    private static void countCardEvents(JsonNode events, Map<String, int[]> cards) {
        for (JsonNode event : events) {
            String type = string(event.path("event_type"));
            if (type == null) continue;
            type = type.replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
            if (!type.equals("yellowcard") && !type.equals("redcard")) continue;
            String id = string(event.path("player").path("id"));
            if (id != null) cards.computeIfAbsent(id, ignored -> new int[2])[type.equals("yellowcard") ? 0 : 1]++;
        }
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
        Set<String> homeKeys = new HashSet<>();
        Set<String> awayKeys = new HashSet<>();
        for (JsonNode period : payload.path("periods")) {
            if (!"All".equals(string(period.path("period")))) continue;
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
        Set<String> recordedKeys = new HashSet<>();
        for (JsonNode group : row.path("stats")) for (var entry : group.path("stats").properties()) {
            JsonNode item = entry.getValue();
            String key = string(item.path("key"));
            JsonNode stat = item.path("stat");
            if (key != null && stat.path("value").isNumber() && recordedKeys.add(key))
                player.recordBasic(key, stat.path("value").asDouble());
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

    private void recordCardEvents(String matchId, JsonNode events, Map<String, PlayerAggregate> players,
            Map<String, TeamAggregate> teams) {
        Map<String, int[]> cards = new LinkedHashMap<>();
        for (JsonNode event : events) {
            String type = string(event.path("event_type"));
            if (type == null) continue;
            type = type.replaceAll("[^A-Za-z]", "").toLowerCase(Locale.ROOT);
            if (!type.equals("yellowcard") && !type.equals("redcard")) continue;
            String id = string(event.path("player").path("id"));
            String teamId = string(event.path("team_id"));
            TeamAggregate team = teams.get(teamId);
            if (id == null || team == null) continue;
            PlayerAggregate player = players.computeIfAbsent(id,
                    value -> new PlayerAggregate(value, string(event.path("player").path("name"))));
            player.teamId = teamId;
            player.teamName = team.name;
            player.appearanceMatches.add(matchId);
        }
        countCardEvents(events, cards);
        for (PlayerAggregate player : players.values()) {
            if (!player.appearanceMatches.contains(matchId)) continue;
            int[] counts = cards.getOrDefault(player.id, new int[2]);
            player.add("yellowCards", (double) counts[0]);
            player.add("redCards", (double) counts[1]);
        }
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
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).timeout(Duration.ofSeconds(30))
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
        double passAccuracyWeightedTotal;
        double passAccuracyWeight;
        void add(String key, Double value) {
            if (value == null || !Double.isFinite(value) || value < 0) return;
            totals.merge(key, value, Double::sum);
            counts.merge(key, 1, Integer::sum);
        }
        void addPath(String key, JsonNode row, String group, String field) {
            JsonNode value = row.path(group).path(field);
            if (value.isNumber()) add(key, value.asDouble());
        }
        void addPassStats(JsonNode row) {
            JsonNode passes = row.path("passing").path("passes");
            JsonNode accuracy = row.path("passing").path("pass_accuracy");
            if (!passes.isNumber() || passes.asDouble() < 0) return;
            double attempts = passes.asDouble();
            add("passes", attempts);
            if (attempts > 0 && accuracy.isNumber() && accuracy.asDouble() >= 0 && accuracy.asDouble() <= 100) {
                passAccuracyWeightedTotal += attempts * accuracy.asDouble();
                passAccuracyWeight += attempts;
            }
        }
        Map<String, Object> values() {
            Map<String, Object> values = new LinkedHashMap<>();
            for (var entry : totals.entrySet()) values.put(entry.getKey(), Math.round(entry.getValue() * 10.0) / 10.0);
            if (passAccuracyWeight > 0 && Math.abs(passAccuracyWeight - totals.getOrDefault("passes", 0.0)) < 0.001)
                values.put("passAccuracy", Math.round(passAccuracyWeightedTotal / passAccuracyWeight * 10.0) / 10.0);
            return values;
        }
        int discardInconsistentPairs() {
            return discardPair("passesCompleted", "passes")
                    + discardPair("shotsOnTarget", "shots")
                    + discardPair("dribblesCompleted", "dribblesAttempted");
        }
        private int discardPair(String numerator, String denominator) {
            Double a = totals.get(numerator), b = totals.get(denominator);
            if (a == null || b == null || a <= b) return 0;
            totals.remove(numerator);
            totals.remove(denominator);
            counts.remove(numerator);
            counts.remove(denominator);
            return 1;
        }
    }

    private static final class TeamAggregate extends Aggregate {
        final String id;
        final String name;
        int games;
        double possessionTotal;
        int possessionCount;
        TeamAggregate(String id, String name) { this.id = id; this.name = name == null ? id : name; }
        void recordScore(int goals, int conceded) { games++; add("goals", (double) goals); add("goalsAgainst", (double) conceded); add("cleanSheets", conceded == 0 ? 1.0 : 0.0); }
        void recordBasic(String key, Double value) {
            String mapped = switch (key) {
                case "total_shots" -> "shots"; case "ShotsOnTarget" -> "shotsOnTarget";
                case "Offsides" -> "offsides"; case "fouls" -> "fouls";
                case "yellow_cards" -> "yellowCards"; case "red_cards" -> "redCards";
                case "keeper_saves" -> "saves";
                default -> null;
            };
            if (mapped != null) add(mapped, value);
        }
        void recordAdvanced(JsonNode row) {
            addPassStats(row);
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
            if (possessionCount == games && games > 0)
                stats.put("possession", Math.round(possessionTotal / games * 10.0) / 10.0);
            if (totals.containsKey("shots") && counts.getOrDefault("shots", 0) == games && games > 0)
                stats.put("shotsPerGame", Math.round(totals.get("shots") / games * 10.0) / 10.0);
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
                case "ShotsOnTarget" -> "shotsOnTarget";
                case "Offsides" -> "offsides"; case "fouls" -> "fouls";
                case "saves" -> "saves";
                default -> null;
            };
            if (mapped != null) add(mapped, value);
        }
        void recordAdvanced(JsonNode row) {
            addPassStats(row);
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
