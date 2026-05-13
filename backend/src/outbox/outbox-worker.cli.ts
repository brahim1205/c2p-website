import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { OutboxModule } from './outbox.module.js';
import { OutboxProcessorService } from './outbox.processor.service.js';

@Module({
  imports: [OutboxModule],
})
class OutboxWorkerCliModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(OutboxWorkerCliModule);
  try {
    const processor = app.get(OutboxProcessorService);
    const result = await processor.processPendingBatch(50);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
