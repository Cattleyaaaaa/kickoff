package top.nextfield.kickoff;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "kickoff.snapshot-dir=target/test-snapshots",
        "kickoff.security.allowed-origins=https://kickoff.example.com"
})
class SecurityConfigTest {
    @Value("${local.server.port}")
    private int port;

    private final HttpClient client = HttpClient.newHttpClient();

    @Test
    void permitsOnlyPublicReadEndpointsAndSetsSecurityHeaders() throws Exception {
        HttpResponse<String> health = send("GET", "/api/v1/health");
        assertEquals(200, health.statusCode());
        assertTrue(health.headers().firstValue("X-Content-Type-Options").orElse("").equals("nosniff"));

        assertEquals(403, send("POST", "/api/v1/health").statusCode());
        assertEquals(403, send("GET", "/api/v1/admin").statusCode());
    }

    @Test
    void rejectsCorsRequestsFromUnconfiguredOrigins() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/v1/news"))
                .header("Origin", "https://attacker.example")
                .header("Access-Control-Request-Method", "GET")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody())
                .build();
        assertEquals(403, client.send(request, HttpResponse.BodyHandlers.ofString()).statusCode());
    }

    private HttpResponse<String> send(String method, String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .method(method, HttpRequest.BodyPublishers.noBody()).build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
