import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AccountRepository } from '../../db/account.repository';
import { hashPassword } from './password.util';

describe('T-5 AuthService', () => {
  let service: AuthService;
  const accounts = { findOneByUsername: jest.fn(), create: jest.fn() };
  const jwt = { signAsync: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      accounts as unknown as AccountRepository,
      jwt as unknown as JwtService,
    );
  });

  it('validate 核对正确凭证返回账号，错误返回 null', async () => {
    const { salt, hash } = hashPassword('pw');
    accounts.findOneByUsername.mockResolvedValue({ username: 'admin', salt, hash, roles: ['admin'] });

    await expect(service.validate('admin', 'pw')).resolves.toMatchObject({ username: 'admin' });
    await expect(service.validate('admin', 'bad')).resolves.toBeNull();
  });

  it('login 合法凭证返回 access_token/username/roles', async () => {
    const { salt, hash } = hashPassword('pw');
    accounts.findOneByUsername.mockResolvedValue({ username: 'dev', salt, hash, roles: ['dev'] });
    jwt.signAsync.mockResolvedValue('signed.jwt');

    const resp = await service.login({ username: 'dev', password: 'pw' });
    expect(resp).toEqual({ accessToken: 'signed.jwt', username: 'dev', roles: ['dev'] });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'dev', username: 'dev', roles: ['dev'] });
  });

  it('login 非法凭证抛 UnauthorizedException 且不签发 token', async () => {
    accounts.findOneByUsername.mockResolvedValue(null);
    await expect(service.login({ username: 'u', password: 'x' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('createAccount 生成 salt/hash 并落库', async () => {
    accounts.create.mockResolvedValue({ username: 'new', salt: 's', hash: 'h', roles: ['ops'] });
    await service.createAccount('new', 'pw', ['ops']);
    const created = accounts.create.mock.calls[0][0];
    expect(created.username).toBe('new');
    expect(created.salt).toHaveLength(64);
    expect(created.hash).toHaveLength(1024);
    expect(created.roles).toEqual(['ops']);
  });
});
