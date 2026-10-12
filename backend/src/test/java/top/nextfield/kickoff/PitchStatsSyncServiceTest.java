package top.nextfield.kickoff;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Locale;

import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class PitchStatsSyncServiceTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void aggregatesSixLeaguesWithoutDuplicateOrMixedPassingMetrics() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1", this::respond);
        server.start();
        try {
            Path output = testOutput("advanced.json");
            var sync = new PitchStatsSyncService("test-key", output.toString(),
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/v1");
            sync.synchronize();
            JsonNode snapshot = mapper.readTree(Files.readString(output));
            assertEquals("pitchapi.dev", snapshot.path("source").asText());
            assertEquals(6, snapshot.path("leagues").size());
            assertEquals(35, snapshot.path("requestCount").asInt());

            JsonNode english = snapshot.path("leagues").path("英超");
            assertEquals(2, english.path("finishedMatches").asInt());
            assertEquals(2, english.path("teamStatsMatches").asInt());
            assertEquals(2, english.path("advancedPlayerMatches").asInt());
            assertEquals(1, english.path("discardedInconsistentMetricPairs").asInt());
            JsonNode home = findById(english.path("teams"), "t_eng_home");
            assertEquals(2, home.path("games").asInt());
            assertEquals(4, home.path("values").path("goals").asInt());
            assertEquals(10, home.path("values").path("shots").asInt());
            assertEquals(5, home.path("values").path("shotsPerGame").asInt());
            assertEquals(30, home.path("values").path("passes").asInt());
            assertEquals(66.7, home.path("values").path("passAccuracy").asDouble(), 0.01);
            assertFalse(home.path("values").has("passesCompleted"));

            JsonNode scorer = findById(english.path("players"), "p_eng_home");
            assertEquals(2, scorer.path("appearances").asInt());
            assertEquals(4, scorer.path("values").path("goals").asInt());
            assertEquals(30, scorer.path("values").path("passes").asInt());
            assertEquals(66.7, scorer.path("values").path("passAccuracy").asDouble(), 0.01);
            assertFalse(scorer.path("values").has("passesCompleted"));
            JsonNode inconsistentPlayer = findById(english.path("players"), "p_eng_away");
            assertFalse(inconsistentPlayer.path("values").has("shots"));
            assertFalse(inconsistentPlayer.path("values").has("shotsOnTarget"));
            assertEquals(2, inconsistentPlayer.path("appearances").asInt());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void failurePreservesPreviousSnapshot() throws Exception {
        Path output = testOutput("previous.json");
        Files.writeString(output, "previous snapshot");
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/v1", exchange -> send(exchange, "{\"data\":{\"leagues\":[]}}"));
        server.start();
        try {
            var sync = new PitchStatsSyncService("test-key", output.toString(),
                    "http://127.0.0.1:" + server.getAddress().getPort() + "/v1");
            assertThrows(IOException.class, sync::synchronize);
            assertEquals("previous snapshot", Files.readString(output));
        } finally {
            server.stop(0);
        }
    }

    private void respond(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath().substring(4);
        if (path.equals("leagues")) {
            int year = LocalDate.now().getMonthValue() >= 7 ? LocalDate.now().getYear() : LocalDate.now().getYear() - 1;
            String season = year + "/" + (year + 1);
            send(exchange, ("{\"data\":{\"leagues\":["
                    + "{\"id\":\"l_eng\",\"name\":\"Premier League\",\"country_code\":\"ENG\",\"seasons\":[\"%s\"]},"
                    + "{\"id\":\"l_esp\",\"name\":\"La Liga\",\"country_code\":\"ESP\",\"seasons\":[\"%s\"]},"
                    + "{\"id\":\"l_ita\",\"name\":\"Serie A\",\"country_code\":\"ITA\",\"seasons\":[\"%s\"]},"
                    + "{\"id\":\"l_ger\",\"name\":\"Bundesliga\",\"country_code\":\"GER\",\"seasons\":[\"%s\"]},"
                    + "{\"id\":\"l_fra\",\"name\":\"Ligue 1\",\"country_code\":\"FRA\",\"seasons\":[\"%s\"]},"
                    + "{\"id\":\"l_uefa\",\"name\":\"UEFA Champions League\",\"seasons\":[\"%s\"]}]}}")
                    .formatted(season, season, season, season, season, season));
            return;
        }
        String[] parts = path.split("/");
        if (parts.length == 3 && parts[0].equals("leagues") && parts[2].equals("matches")) {
            String code = parts[1].substring(2);
            StringBuilder matches = new StringBuilder();
            int count = code.equals("eng") ? 2 : 1;
            for (int i = 1; i <= count; i++) {
                if (i > 1) matches.append(',');
                matches.append("{\"id\":\"m_").append(code).append('_').append(i)
                        .append("\",\"status\":\"finished\",\"score_home\":2,\"score_away\":1,")
                        .append("\"home_team\":{\"id\":\"t_").append(code).append("_home\",\"name\":\"Home ")
                        .append(code).append("\"},\"away_team\":{\"id\":\"t_").append(code)
                        .append("_away\",\"name\":\"Away ").append(code).append("\"}}");
            }
            send(exchange, "{\"data\":{\"matches\":[" + matches + "]}}");
            return;
        }
        if (parts.length >= 3 && parts[0].equals("matches")) {
            String matchId = parts[1];
            String[] id = matchId.split("_");
            String code = id[1];
            int matchNumber = Integer.parseInt(id[2]);
            String home = "t_" + code + "_home", away = "t_" + code + "_away";
            String first = "p_" + code + "_home", second = "p_" + code + "_away";
            if (parts[2].equals("stats")) {
                send(exchange, "{\"data\":{\"periods\":[{\"period\":\"All\",\"groups\":["
                        + "{\"items\":[{\"key\":\"total_shots\",\"home\":\"5\",\"away\":\"4\"},"
                        + "{\"key\":\"ShotsOnTarget\",\"home\":\"3\",\"away\":\"2\"}]},"
                        + "{\"items\":[{\"key\":\"total_shots\",\"home\":\"5\",\"away\":\"4\"},"
                        + "{\"key\":\"accurate_passes\",\"home\":\"99\",\"away\":\"99\"}]}]}]}}");
                return;
            }
            if (parts[2].equals("players") && parts.length == 3) {
                String invalidShots = code.equals("eng") ? "3" : "1";
                send(exchange, "{\"data\":["
                        + playerBasic(first, home, 2, 5, 3) + ","
                        + playerBasic(second, away, 0, 2, Integer.parseInt(invalidShots)) + "]}");
                return;
            }
            if (parts[2].equals("advanced") && parts.length == 3) {
                int attempts = matchNumber == 1 ? 10 : 20;
                double accuracy = matchNumber == 1 ? 80 : 60;
                send(exchange, "{\"data\":{\"teams\":["
                        + advancedTeam(home, attempts, accuracy) + "," + advancedTeam(away, attempts, accuracy)
                        + "]}}");
                return;
            }
            if (parts[2].equals("advanced") && parts.length == 4 && parts[3].equals("players")) {
                int attempts = matchNumber == 1 ? 10 : 20;
                double accuracy = matchNumber == 1 ? 80 : 60;
                send(exchange, "{\"data\":{\"players\":["
                        + advancedPlayer(first, home, attempts, accuracy) + ","
                        + advancedPlayer(second, away, attempts, accuracy) + "]}}");
                return;
            }
        }
        send(exchange, "{\"error\":{\"code\":\"NOT_FOUND\"}}");
    }

    private static String playerBasic(String id, String teamId, int goals, int shots, int shotsOnTarget) {
        return ("{\"player\":{\"id\":\"%s\",\"name\":\"%s\",\"position_id\":4},\"team_id\":\"%s\","
                + "\"stats\":[{\"stats\":{\"Goals\":{\"key\":\"goals\",\"stat\":{\"value\":%d}},"
                + "\"Shots\":{\"key\":\"total_shots\",\"stat\":{\"value\":%d}},"
                + "\"Target\":{\"key\":\"ShotsOnTarget\",\"stat\":{\"value\":%d}},"
                + "\"Passes\":{\"key\":\"accurate_passes\",\"stat\":{\"value\":99}}}},"
                + "{\"stats\":{\"RepeatedGoals\":{\"key\":\"goals\",\"stat\":{\"value\":%d}}}}]}")
                .formatted(id, id, teamId, goals, shots, shotsOnTarget, goals);
    }

    private static String advancedTeam(String teamId, int passes, double accuracy) {
        return String.format(Locale.ROOT, "{\"team\":{\"id\":\"%s\"},\"passing\":{\"passes\":%d,\"pass_accuracy\":%.1f},"
                + "\"carrying\":{\"take_ons\":2,\"take_ons_won\":1},\"territory\":{\"possession_pct\":50}}",
                teamId, passes, accuracy);
    }

    private static String advancedPlayer(String playerId, String teamId, int passes, double accuracy) {
        return String.format(Locale.ROOT, "{\"player\":{\"id\":\"%s\"},\"team_id\":\"%s\","
                + "\"passing\":{\"passes\":%d,\"pass_accuracy\":%.1f}}",
                playerId, teamId, passes, accuracy);
    }

    private static JsonNode findById(JsonNode rows, String id) {
        for (JsonNode row : rows) if (id.equals(row.path("id").asText())) return row;
        throw new AssertionError("Missing row " + id);
    }

    private static Path testOutput(String name) throws IOException {
        Path directory = Path.of("target", "test-output");
        Files.createDirectories(directory);
        return directory.resolve(name);
    }

    private static void send(HttpExchange exchange, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        try (var body = exchange.getResponseBody()) { body.write(bytes); }
    }
}
