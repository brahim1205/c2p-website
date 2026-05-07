import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { CreateUserUseCase } from './application/create-user.usecase.js';
import { GetUserUseCase } from './application/get-user.usecase.js';
import { IUserRepository, USER_REPOSITORY } from './domain/user.repository.js';

@Injectable()
export class UserService {
  private readonly createUserUseCase: CreateUserUseCase;
  private readonly getUserUseCase: GetUserUseCase;

  constructor(@Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository) {
    this.createUserUseCase = new CreateUserUseCase(this.userRepository);
    this.getUserUseCase = new GetUserUseCase(this.userRepository);
  }

  create(data: CreateUserDto) {
    return this.createUserUseCase.execute(data);
  }

  async getById(id: number) {
    const user = await this.getUserUseCase.execute(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
