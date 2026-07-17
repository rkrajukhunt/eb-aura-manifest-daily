import { SentryModule } from '@sentry/nestjs/setup';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { validateEnv, type Env } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { buildLoggerConfig } from './observability/logger.config';
import { ProvidersModule } from './providers/providers.module';

/**
 * The thin backend's root (04 §1).
 *
 * Modules arriving in later phases: AuthModule (2), MemoryModule (4),
 * GenerationModule + SafetyModule (5), SchedulerModule + NotificationsModule (7/9),
 * WebhooksModule (10), AnalyticsModule (2/11).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Boot dies on a bad env rather than failing inside a user's generation (04 §6).
      validate: validateEnv,
      cache: true,
      envFilePath: ['.env.local', '.env'],
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: buildLoggerConfig({
          NODE_ENV: config.get('NODE_ENV', { infer: true }),
          isProduction: config.get('NODE_ENV', { infer: true }) === 'production',
        }),
      }),
    }),

    SentryModule.forRoot(),
    ProvidersModule,
    HealthModule,
  ],
})
export class AppModule {}
