import { User } from './user.entity.js';

export type CreateUserData = {
  email: string;
  firstName: string;
  lastName: string;
};

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
