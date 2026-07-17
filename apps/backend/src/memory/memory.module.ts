import { Module } from '@nestjs/common';

import { MemoryContextService } from './memory-context.service';

@Module({
  providers: [MemoryContextService],
  exports: [MemoryContextService],
})
export class MemoryModule {}
