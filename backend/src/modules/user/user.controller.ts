import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UserService } from './user.service.js';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body(new ZodValidationPipe(createUserSchema)) payload: CreateUserDto) {
    const user = await this.userService.create(payload);
    return UserResponseDto.fromEntity(user);
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getById(id);
    return UserResponseDto.fromEntity(user);
  }
}
