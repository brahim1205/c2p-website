import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PublicController } from './public.controller.js';
import { PublicIntakeService } from './public-intake.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicController],
  providers: [PublicIntakeService],
})
export class PublicModule {}
