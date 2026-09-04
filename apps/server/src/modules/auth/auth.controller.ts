import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginRequestSchema, type LoginRequest } from '@open5gs/shared';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('login')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '登录：校验 Account 凭证并签发 access_token' })
  async login(@Body() body: LoginRequest): Promise<unknown> {
    const parsed = LoginRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('username/password 必填且非空');
    return this.auth.login(parsed.data);
  }
}
