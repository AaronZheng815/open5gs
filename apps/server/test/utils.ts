import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule, type TestingModuleBuilder } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

export interface InjectResponse {
  statusCode: number;
  payload: string;
}

export interface InjectInstance {
  inject(opts: { method: string; url: string; headers?: Record<string, string>; payload?: string }): Promise<InjectResponse>;
}

export interface Booted {
  app: NestFastifyApplication;
  instance: InjectInstance;
  token: string;
  configDir: string;
  authHeaders: Record<string, string>;
  /** 关闭 app + 清理临时配置目录 + drop 隔离测试库。 */
  cleanup: () => Promise<void>;
}

let seq = 0;

/**
 * 生成临时配置目录（含 config/ 子目录放 yaml，config-backup 备份落在 root 下），
 * 返回 (configDir, root)。备份在 dirname(configDir)/config-backup，故包一层 root 便于整体清理。
 */
function makeConfigRoot(files: Record<string, string>): { configDir: string; root: string } {
  const root = mkdtempSync(join(tmpdir(), `ogs-e2e-${process.pid}-${seq++}-`));
  const config = join(root, 'config');
  mkdirSync(config);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(config, name), content, 'utf8');
  }
  return { configDir: config, root };
}

/** 生成一份最小可用网元 yaml：`<nf>:\n  sbi.server[].address`（inventory.loader 可解析出 addr）。 */
export function nfYaml(nf: string, addr: string, extra = ''): string {
  return `${nf}:\n  sbi:\n    server:\n      - address: ${addr}\n${extra}`;
}

/**
 * 启动一个隔离的 AppModule：独立测试库（MONGO_URI）+ 作用域配置目录（OGS_CONFIG_DIR）。
 * 生成合法 JWT（复用 app 内 JwtService，同一 secret）。
 * override 可选，用于注入 exec/getText 等安全 seam（不碰真实 systemd/:9090）。
 */
export async function bootApp(opts: {
  dbTag: string;
  configFiles?: Record<string, string>;
  override?: (b: TestingModuleBuilder) => TestingModuleBuilder;
}): Promise<Booted> {
  const db = `open5gs_nms_e2e_${opts.dbTag}_${Date.now()}_${seq++}`;
  process.env.MONGO_URI = `mongodb://localhost/${db}`;
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'open5gs-nms-dev-secret';
  const { configDir, root } = makeConfigRoot(opts.configFiles ?? {});
  process.env.OGS_CONFIG_DIR = configDir;

  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (opts.override) builder = opts.override(builder);

  const moduleRef: TestingModule = await builder.compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  const jwt = app.get(JwtService);
  const token = await jwt.signAsync({ sub: 'admin', username: 'admin', roles: ['admin'] });
  const authHeaders = { authorization: `Bearer ${token}` };
  const instance = app.getHttpAdapter().getInstance() as unknown as InjectInstance;

  const cleanup = async (): Promise<void> => {
    try {
      const conn = app.get<Connection>(getConnectionToken());
      await conn.dropDatabase();
    } catch {
      /* 测试库可能未建任何集合 */
    }
    await app.close();
    rmSync(root, { recursive: true, force: true });
  };

  return { app, instance, token, configDir, authHeaders, cleanup };
}

/** 便捷 JSON 请求（带鉴权头）。 */
export async function get(instance: InjectInstance, url: string, headers: Record<string, string>): Promise<InjectResponse> {
  return instance.inject({ method: 'GET', url, headers });
}

export async function post(
  instance: InjectInstance,
  url: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<InjectResponse> {
  // 无 body（如 lifecycle restart 不需要请求体）时不要带 content-type，否则 Fastify JSON 解析空串会回 400。
  const hasBody = body !== undefined;
  return instance.inject({
    method: 'POST',
    url,
    headers: hasBody ? { 'content-type': 'application/json', ...headers } : { ...headers },
    payload: hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
}
