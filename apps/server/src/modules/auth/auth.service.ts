import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { LoginRequest, LoginResponse, Role } from '@open5gs/shared';
import { AccountRepository } from '../../db/account.repository';
import type { AccountDoc } from '../../db/account.schema';
import { hashPassword, verifyPassword } from './password.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly jwt: JwtService,
  ) {}

  /** 校验凭证：经 Account 既有 salt/hash（passport-local-mongoose v8 算法）验证，返回账号或 null。 */
  async validate(username: string, password: string): Promise<AccountDoc | null> {
    const account = await this.accounts.findOneByUsername(username);
    if (!account || !account.salt || !account.hash) return null;
    return verifyPassword(password, account.salt, account.hash) ? account : null;
  }

  async login(dto: LoginRequest): Promise<LoginResponse> {
    const account = await this.validate(dto.username, dto.password);
    if (!account) throw new UnauthorizedException('用户名或口令错误');
    const roles = (account.roles ?? []) as Role[];
    const accessToken = await this.jwt.signAsync({ sub: account.username, username: account.username, roles });
    return { accessToken, username: account.username, roles };
  }

  /** 创建账号（引导/测试用）：按同一算法生成 salt+hash。 */
  async createAccount(username: string, password: string, roles: Role[]): Promise<AccountDoc> {
    const { salt, hash } = hashPassword(password);
    return this.accounts.create({ username, salt, hash, roles });
  }
}
