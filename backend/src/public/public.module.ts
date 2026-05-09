import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { PublicController } from './public.controller.js';
import { PublicIntakeService } from './public-intake.service.js';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PublicController],
  providers: [PublicIntakeService],
})
export class PublicModule {}
