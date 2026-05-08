import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(configService: ConfigService) {
    if (configService.redisDisabled || !configService.redisHost || configService.redisHost === 'disabled') {
      if (!configService.redisUrl) {
        this.client = null;
        this.logger.warn('Redis disabled by configuration.');
        return;
      }
    }

    this.client = configService.redisUrl
      ? new Redis(configService.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      })
      : new Redis({
        host: configService.redisHost,
        port: configService.redisPort,
        username: configService.redisUsername,
        password: configService.redisPassword,
        db: configService.redisDb,
        tls: configService.redisTls ? {} : undefined,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

    this.client.on('connect', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (error: unknown) => this.logger.error('Redis error', error));
    void this.client.connect().catch((error: unknown) => {
      this.logger.warn(`Redis unavailable, continuing without cache: ${String(error)}`);
    });
  }

  async onModuleDestroy() {
    if (this.client && this.client.status !== 'end') {
      await this.client.quit().catch(() => undefined);
    }
  }

  async get<T = string>(key: string): Promise<T | null> {
    if (!this.client) return null;
    return (await this.client.get(key)) as T | null;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }
}
