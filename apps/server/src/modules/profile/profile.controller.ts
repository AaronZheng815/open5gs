import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfileService } from './profile.service';
import type { ProfileDoc } from '../../db/profile.schema';

@ApiTags('profile')
@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  @ApiOperation({ summary: '列表：profiles' })
  list(): Promise<ProfileDoc[]> {
    return this.service.list();
  }

  @Get(':title')
  get(@Param('title') title: string): Promise<ProfileDoc> {
    return this.service.get(title);
  }

  @Post()
  @HttpCode(200)
  create(@Body() body: ProfileDoc): Promise<ProfileDoc> {
    return this.service.create(body);
  }

  @Put(':title')
  update(@Param('title') title: string, @Body() body: Partial<ProfileDoc>): Promise<ProfileDoc> {
    return this.service.update(title, body);
  }

  @Delete(':title')
  @HttpCode(200)
  delete(@Param('title') title: string): Promise<void> {
    return this.service.delete(title);
  }
}
