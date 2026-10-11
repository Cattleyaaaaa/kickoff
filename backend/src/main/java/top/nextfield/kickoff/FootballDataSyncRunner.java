package top.nextfield.kickoff;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "kickoff.sync-on-start", havingValue = "true")
public class FootballDataSyncRunner implements ApplicationRunner {
    private final FootballDataSyncService syncService;

    public FootballDataSyncRunner(FootballDataSyncService syncService) {
        this.syncService = syncService;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        syncService.synchronize();
    }
}
