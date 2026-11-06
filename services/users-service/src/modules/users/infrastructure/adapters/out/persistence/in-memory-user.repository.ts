import { ConflictError } from '../../../../domain/exceptions/domain-error.js';
import { User } from '../../../../domain/entities/user.js';
import { UserRepository } from '../../../../domain/ports/user.repository.js';

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  constructor(private readonly institutionalDomain = 'correounivalle.edu.co') {}

  async save(user: User): Promise<void> {
    const duplicate = [...this.users.values()].find(
      (item) => item.email === user.email && item.id !== user.id,
    );
    if (duplicate) throw new ConflictError('Email is already registered');
    this.users.set(
      user.id,
      User.reconstitute(user.toData(), this.institutionalDomain),
    );
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user
      ? User.reconstitute(user.toData(), this.institutionalDomain)
      : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = [...this.users.values()].find((item) => item.email === email);
    return user
      ? User.reconstitute(user.toData(), this.institutionalDomain)
      : null;
  }

  async findAll(): Promise<User[]> {
    return [...this.users.values()].map((user) =>
      User.reconstitute(user.toData(), this.institutionalDomain),
    );
  }
}
