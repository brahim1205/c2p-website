import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service.js';
import { validateEnvironmentConfig } from './config.validation.js';

function resolveEnvFiles() {
  const runtimeEnv = process.env.NODE_ENV?.trim() || 'development';
  const files = [
    `.env.${runtimeEnv}`,
    runtimeEnv === 'production' ? '.env.prod' : '',
    '.env',
  ].filter(Boolean);

  return files;
}

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveEnvFiles(),
      validate: validateEnvironmentConfig,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
