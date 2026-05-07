import { CreateUserData, IUserRepository } from '../domain/user.repository.js';

export class CreateUserUseCase {
  constructor(private readonly repository: IUserRepository) {}

  execute(input: CreateUserData) {
    return this.repository.create(input);
  }
}
