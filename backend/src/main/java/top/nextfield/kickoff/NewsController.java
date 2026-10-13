package top.nextfield.kickoff;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NewsController {
    private final NewsFeedService newsFeed;

    public NewsController(NewsFeedService newsFeed) { this.newsFeed = newsFeed; }

    @GetMapping(value = "/api/v1/news", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> news() {
        try {
            return ResponseEntity.ok().cacheControl(CacheControl.noCache())
                    .contentType(MediaType.APPLICATION_JSON).body(newsFeed.latest());
        } catch (IOException exception) {
            return ResponseEntity.status(503).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "BBC Sport news feed unavailable"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return ResponseEntity.status(503).contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "BBC Sport news request interrupted"));
        }
    }
}
