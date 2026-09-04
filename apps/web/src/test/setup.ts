import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/** AntD 依赖 window.matchMedia，jsdom 未实现 → 打桩（返回不匹配） */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/** AntD 组件（Table/List/Splitter 等）用到 ResizeObserver → 空桩 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

/** 返回 true 时默认改为受控（避免 hover 警告干扰） */
Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: window.getComputedStyle.bind(window),
});
