import { Module } from '@nestjs/common';

import { MemoryModule } from '../memory/memory.module';
import { SafetyModule } from '../safety/safety.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CreditsService } from './credits.service';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { JobsService } from './jobs/jobs.service';
import { PromptService } from './prompt/prompt.service';
import { QaModule } from './qa/qa.module';
import { StorageService } from './storage.service';

/**
 * The generation orchestration module (04 §1). Ties together the pipeline:
 * memory context, prompts, QA gate, crisis safety, the job state machine, and
 * storage. Providers (LLM/TTS) and the service-role client are global.
 */
@Module({
  imports: [MemoryModule, SafetyModule, QaModule, SubscriptionsModule],
  controllers: [GenerationController],
  providers: [GenerationService, JobsService, PromptService, StorageService, CreditsService],
  exports: [JobsService, CreditsService],
})
export class GenerationModule {}
