import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './roles.guard';

/** 声明访问所需角色（与 RolesGuard 配合）。 */
export const Roles = (...roles: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
