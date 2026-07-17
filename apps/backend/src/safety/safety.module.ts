import { Module } from '@nestjs/common';

import { CrisisDetectionService } from './crisis-detection.service';

/**
 * Safety layer (14 §5, 08 §8). `CrisisDetectionService` depends on the @Global
 * LLM_PROVIDER, so no imports are needed here; the generation pipeline consumes
 * it by importing this module.
 */
@Module({
  providers: [CrisisDetectionService],
  exports: [CrisisDetectionService],
})
export class SafetyModule {}
