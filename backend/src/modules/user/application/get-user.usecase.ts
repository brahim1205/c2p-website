import { IUserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.entity.js';

export class GetUserUseCase {
  constructor(private readonly repository: IUserRepository) {}

  execute(id: number): Promise<User | null> {
    return this.repository.findById(id);
  }
}
