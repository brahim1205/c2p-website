import { Injectable, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service.js';
import { CreateUserData, IUserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.entity.js';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private createUserId() {
    return `usr-${randomUUID()}`;
  }

  async create(data: CreateUserData) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const record = await this.prisma.user.create({
      data: {
        id: this.createUserId(),
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      },
    });
    return new User(record.id, record.email, record.firstName, record.lastName, record.createdAt, record.updatedAt);
  }

  async findById(id: string) {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? new User(record.id, record.email, record.firstName, record.lastName, record.createdAt, record.updatedAt) : null;
  }

  async findByEmail(email: string) {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? new User(record.id, record.email, record.firstName, record.lastName, record.createdAt, record.updatedAt) : null;
  }
}
