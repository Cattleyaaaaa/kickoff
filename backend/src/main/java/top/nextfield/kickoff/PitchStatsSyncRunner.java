package top.nextfield.kickoff;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "kickoff.sync-pitch-on-start", havingValue = "true")
public class PitchStatsSyncRunner implements ApplicationRunner {
    private final PitchStatsSyncService syncService;

    public PitchStatsSyncRunner(PitchStatsSyncService syncService) { this.syncService = syncService; }

    @Override
    public void run(ApplicationArguments args) throws Exception { syncService.synchronize(); }
}
