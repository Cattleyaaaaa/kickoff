package top.nextfield.kickoff;

import java.util.List;
import java.util.Map;

public record NewsSnapshot(String source, String updatedAt, List<NewsItem> items) {
    public record NewsItem(String id, String title, String url, String publishedAt, String category,
                           String summary, Map<String, String> localizedTitles,
                           Map<String, String> localizedSummaries, String body,
                           Map<String, String> localizedBodies, Boolean aiGenerated,
                           List<String> sourceMatchIds, List<DataSource> dataSources) {}
    public record DataSource(String label, String updatedAt, String url, String recordId) {}
}
