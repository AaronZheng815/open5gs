import { exec } from 'node:child_process';
import { unitFor, statusOf, execCapture } from './status.util';

jest.mock('node:child_process');

const mockExec = exec as unknown as jest.Mock;

function setExec(data: { code?: number; stdout?: string; stderr?: string }): void {
  mockExec.mockImplementation((_cmd: string, cb: (err: Error | null, stdout: string, stderr: string) => void) => {
    const code = data.code ?? 0;
    const err = code === 0 ? null : (Object.assign(new Error(data.stderr ?? 'exit 1'), { code }) as Error);
    cb(err, data.stdout ?? '', data.stderr ?? '');
  });
}

describe('lifecycle status.util', () => {
  beforeEach(() => mockExec.mockReset());

  it('unitFor 生成 open5gs-<nf>d 单元名', () => {
    expect(unitFor('amf')).toBe('open5gs-amfd');
    expect(unitFor('nrf')).toBe('open5gs-nrfd');
    expect(unitFor('mme')).toBe('open5gs-mmed');
  });

  it('statusOf 对 active/inactive/failed 原样映射（与 systemctl is-active 输出一致，AC-6）', async () => {
    setExec({ stdout: 'active\n' });
    await expect(statusOf('amf')).resolves.toBe('active');
    expect(mockExec).toHaveBeenCalledWith('systemctl is-active open5gs-amfd', expect.any(Function));

    setExec({ code: 3, stdout: 'inactive\n' });
    await expect(statusOf('amf')).resolves.toBe('inactive');
  });

  it('statusOf 非三态输出（未知/空）映射为 unknown', async () => {
    setExec({ stdout: 'whatever\n' });
    await expect(statusOf('amf')).resolves.toBe('unknown');
    setExec({ stdout: '' });
    await expect(statusOf('amf')).resolves.toBe('unknown');
  });

  it('execCapture 捕获非零退出码（不抛错）并返回 stdout/stderr', async () => {
    setExec({ code: 5, stdout: '', stderr: 'Failed to restart' });
    const r = await execCapture('systemctl restart open5gs-amfd');
    expect(r.code).toBe(5);
    expect(r.stderr).toContain('Failed to restart');
  });
});
