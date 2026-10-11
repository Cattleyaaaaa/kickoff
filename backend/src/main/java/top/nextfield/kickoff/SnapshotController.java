package top.nextfield.kickoff;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SnapshotController {
    private final Path footballSnapshot;

    public SnapshotController(@Value("${kickoff.snapshot-dir}") String snapshotDir) {
        footballSnapshot = Path.of(snapshotDir).resolve("football.json");
    }

    @GetMapping(value = "/api/v1/football", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> football() {
        try {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noCache())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Files.readString(footballSnapshot, StandardCharsets.UTF_8));
        } catch (IOException exception) {
            return ResponseEntity.status(503)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"error\":\"football snapshot unavailable\"}");
        }
    }

    @GetMapping("/api/v1/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
