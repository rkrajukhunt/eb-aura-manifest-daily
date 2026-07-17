import { Module } from '@nestjs/common';

import { QaService } from './qa.service';

/**
 * The QA gate (08 §5) as its own module so the generation pipeline can inject it
 * without pulling in provider or persistence wiring — the gate is pure and has no
 * dependencies of its own.
 */
@Module({
  providers: [QaService],
  exports: [QaService],
})
export class QaModule {}
