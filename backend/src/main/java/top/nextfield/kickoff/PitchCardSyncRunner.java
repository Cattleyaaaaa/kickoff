package top.nextfield.kickoff;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "kickoff.sync-pitch-cards-on-start", havingValue = "true")
public class PitchCardSyncRunner implements ApplicationRunner {
    private final PitchStatsSyncService syncService;

    public PitchCardSyncRunner(PitchStatsSyncService syncService) { this.syncService = syncService; }

    @Override
    public void run(ApplicationArguments args) throws Exception { syncService.synchronizeCards(); }
}
