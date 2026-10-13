package top.nextfield.kickoff;

import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.net.InetSocketAddress;
import java.net.ProxySelector;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import java.nio.file.Files;
import java.nio.file.Path;

import tools.jackson.databind.json.JsonMapper;
import org.springframework.beans.factory.annotation.Value;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.xml.sax.InputSource;

/** Fetches BBC Sport's public football RSS feed and caches only its headline metadata. */
@Service
public class NewsFeedService {
    private static final Logger log = LoggerFactory.getLogger(NewsFeedService.class);
    private static final URI FEED = URI.create("https://feeds.bbci.co.uk/sport/football/rss.xml");
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);
    private static final int MAX_ITEMS = 60;
    private static final int MAX_FEED_BYTES = 1_048_576;
    private final HttpClient client;
    private final Path editorialSnapshot;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private NewsSnapshot cached;
    private Instant cachedAt = Instant.EPOCH;

    public NewsFeedService(@Value("${kickoff.snapshot-dir}") String snapshotDir,
                           @Value("${kickoff.news.proxy:}") String proxySetting) {
        this.editorialSnapshot = Path.of(snapshotDir).resolve("news.json");
        HttpClient.Builder clientBuilder = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5));
        URI proxyUri = parseProxy(proxySetting);
        if (proxyUri != null) {
            int port = proxyUri.getPort() > 0 ? proxyUri.getPort()
                    : ("https".equalsIgnoreCase(proxyUri.getScheme()) ? 443 : 80);
            clientBuilder.proxy(ProxySelector.of(new InetSocketAddress(proxyUri.getHost(), port)));
            log.info("BBC RSS requests will use configured HTTPS proxy {}:{}", proxyUri.getHost(), port);
        }
        this.client = clientBuilder.build();
    }

    private static URI parseProxy(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            URI uri = URI.create(value.trim());
            if (uri.getHost() == null || !("http".equalsIgnoreCase(uri.getScheme())
                    || "https".equalsIgnoreCase(uri.getScheme()))) {
                log.warn("Ignoring invalid HTTPS_PROXY value; expected an http(s) proxy URL.");
                return null;
            }
            return uri;
        } catch (IllegalArgumentException exception) {
            log.warn("Ignoring invalid HTTPS_PROXY value; expected an http(s) proxy URL.");
            return null;
        }
    }

    public synchronized NewsSnapshot latest() throws IOException, InterruptedException {
        if (Files.isRegularFile(editorialSnapshot)) {
            NewsSnapshot editorial = mapper.readValue(Files.readString(editorialSnapshot), NewsSnapshot.class);
            if ("Kickoff".equals(editorial.source()) && editorial.items() != null && !editorial.items().isEmpty())
                return editorial;
        }
        if (cached != null && Instant.now().isBefore(cachedAt.plus(CACHE_TTL))) return cached;
        HttpRequest request = HttpRequest.newBuilder(FEED).timeout(Duration.ofSeconds(8))
                .header("User-Agent", "KickoffFootballHub/0.1 (+https://kickoff.nextfield.top)")
                .header("Accept", "application/rss+xml, application/xml, text/xml")
                .GET().build();
        try {
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200) throw new IOException("BBC Sport RSS returned HTTP " + response.statusCode());
            long declaredLength = response.headers().firstValueAsLong("Content-Length").orElse(-1);
            byte[] bytes = response.body();
            if (declaredLength > MAX_FEED_BYTES || bytes.length > MAX_FEED_BYTES)
                throw new IOException("BBC Sport RSS exceeded the feed size limit.");
            List<NewsSnapshot.NewsItem> items = parse(new String(bytes, StandardCharsets.UTF_8));
            if (items.isEmpty()) throw new IOException("BBC Sport RSS contained no usable football stories.");
            cached = new NewsSnapshot("BBC Sport", Instant.now().toString(), items);
            cachedAt = Instant.now();
            return cached;
        } catch (IOException exception) {
            log.warn("BBC Sport RSS request failed: {}", exception.toString());
            if (cached != null) return cached;
            throw exception;
        } catch (InterruptedException exception) {
            if (cached != null) return cached;
            throw exception;
        }
    }

    static List<NewsSnapshot.NewsItem> parse(String xml) throws IOException {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            var builder = factory.newDocumentBuilder();
            builder.setEntityResolver((publicId, systemId) -> new InputSource(new StringReader("")));
            var document = builder.parse(new InputSource(new StringReader(xml)));
            var nodes = document.getElementsByTagName("item");
            List<NewsSnapshot.NewsItem> items = new ArrayList<>();
            for (int i = 0; i < nodes.getLength() && items.size() < MAX_ITEMS; i++) {
                if (!(nodes.item(i) instanceof Element item)) continue;
                String title = childText(item, "title");
                String link = childText(item, "link");
                String date = childText(item, "pubDate");
                if (title.isBlank() || link.isBlank()) continue;
                URI url = URI.create(link);
                String host = Optional.ofNullable(url.getHost()).orElse("").toLowerCase();
                if (!url.getScheme().equalsIgnoreCase("https") || !(host.equals("bbc.co.uk")
                        || host.endsWith(".bbc.co.uk") || host.equals("bbc.com") || host.endsWith(".bbc.com"))) continue;
                String publishedAt;
                try { publishedAt = ZonedDateTime.parse(date, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toString(); }
                catch (Exception ignored) { publishedAt = ""; }
                String id = Optional.ofNullable(childText(item, "guid")).filter(value -> !value.isBlank()).orElse(link);
                String category = childText(item, "category");
                items.add(new NewsSnapshot.NewsItem(id, title, url.toString(), publishedAt, category,
                        "", Map.of(), Map.of(), "", Map.of(), false, List.of(), List.of()));
            }
            items.sort(Comparator.comparing(NewsSnapshot.NewsItem::publishedAt).reversed());
            return List.copyOf(items);
        } catch (Exception exception) {
            if (exception instanceof IOException io) throw io;
            throw new IOException("Could not parse BBC Sport football RSS.", exception);
        }
    }

    private static String childText(Element element, String tag) {
        for (Node node = element.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node instanceof Element child && tag.equals(child.getTagName())) return child.getTextContent().trim();
        }
        return "";
    }
}
