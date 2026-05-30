import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { PermissionGuard } from '../../auth/permission.guard.js';
import { RequirePermission } from '../../auth/require-permission.decorator.js';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(PermissionGuard)
  @RequirePermission('users.manage')
  async create(@Body(new ZodValidationPipe(createUserSchema)) payload: CreateUserDto) {
    const user = await this.userService.create(payload);
    return UserResponseDto.fromEntity(user);
  }

  @Get(':id')
  @UseGuards(PermissionGuard)
  @RequirePermission('users.read')
  async getById(@Param('id') id: string) {
    const user = await this.userService.getById(id);
    return UserResponseDto.fromEntity(user);
  }
}
