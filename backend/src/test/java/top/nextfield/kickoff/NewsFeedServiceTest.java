package top.nextfield.kickoff;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

class NewsFeedServiceTest {
    private final Path snapshotDir = Path.of("target", "test-output", "news-test");

    @Test
    void servesSameOwnedStoryWithCachedTranslations() throws Exception {
        Files.createDirectories(snapshotDir);
        Files.writeString(snapshotDir.resolve("news.json"), """
                {"source":"Kickoff","updatedAt":"2026-10-12T12:00:00Z","items":[{
                  "id":"story-1","title":"原创标题","summary":"原创摘要","body":"原创正文",
                  "url":"https://example.com/source","publishedAt":"2026-10-12T11:00:00Z",
                  "category":"英超","localizedTitles":{"zh-CN":"原创标题","zh-TW":"原創標題","en":"Original headline"},
                  "localizedSummaries":{"zh-CN":"原创摘要","zh-TW":"原創摘要","en":"Original summary"},
                  "localizedBodies":{"zh-CN":"原创正文","zh-TW":"原創正文","en":"Original article"},
                  "aiGenerated":true,"sourceMatchIds":["fixture-1"],
                  "dataSources":[{"label":"PitchAPI · verified match statistics","updatedAt":"2026-10-12T12:00:00Z","url":"https://pitchapi.dev/","recordId":"m_123456"}]
                }]}
                """);
        var snapshot = new NewsFeedService(snapshotDir.toString(), "").latest();
        assertEquals("Kickoff", snapshot.source());
        assertEquals("story-1", snapshot.items().getFirst().id());
        assertEquals("Original headline", snapshot.items().getFirst().localizedTitles().get("en"));
        assertEquals("Original article", snapshot.items().getFirst().localizedBodies().get("en"));
        assertEquals(true, snapshot.items().getFirst().aiGenerated());
        assertEquals("fixture-1", snapshot.items().getFirst().sourceMatchIds().getFirst());
        assertEquals("m_123456", snapshot.items().getFirst().dataSources().getFirst().recordId());
    }

    @Test
    void parsesAttributedBbcHeadlinesAndRejectsExternalArticleLinks() throws Exception {
        String xml = """
                <?xml version="1.0"?>
                <rss version="2.0"><channel>
                  <item><title>Match &amp; analysis</title><link>https://www.bbc.co.uk/sport/football/123</link>
                    <guid>story-1</guid><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate><category>Football</category></item>
                  <item><title>Bad source</title><link>https://example.com/story</link></item>
                  <item><title>FTP link</title><link>http://www.bbc.co.uk/sport/football/456</link></item>
                </channel></rss>
                """;
        var items = NewsFeedService.parse(xml);
        assertEquals(1, items.size());
        assertEquals("Match & analysis", items.getFirst().title());
        assertEquals("https://www.bbc.co.uk/sport/football/123", items.getFirst().url());
        assertEquals("2026-10-12T10:00:00Z", items.getFirst().publishedAt());
        assertEquals("Football", items.getFirst().category());
    }

    @Test
    void rejectsDoctypeAndExternalEntityDeclarations() {
        String malicious = "<!DOCTYPE rss [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><rss><channel>"
                + "<item><title>&x;</title><link>https://www.bbc.co.uk/a</link></item></channel></rss>";
        assertThrows(IOException.class, () -> NewsFeedService.parse(malicious));
    }
}
