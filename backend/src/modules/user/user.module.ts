import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository.js';
import { USER_REPOSITORY } from './domain/user.repository.js';
import { UserController } from './user.controller.js';
import { UserService } from './user.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UserController],
  providers: [
    UserService,
    PrismaUserRepository,
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule {}
