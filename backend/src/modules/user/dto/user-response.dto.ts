import { User } from '../domain/user.entity.js';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.createdAt = user.createdAt.toISOString();
    this.updatedAt = user.updatedAt.toISOString();
  }

  static fromEntity(user: User) {
    return new UserResponseDto(user);
  }
}
