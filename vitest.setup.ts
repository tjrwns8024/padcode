// 전역 테스트 setup.
//
// 이 phase의 다음 step들이 `vi.mock("tone")` / `vi.mock("@/lib/audio/master")`
// 로 오디오 모듈을 모킹하므로, 여기서는 jsdom에 없는 브라우저 API의
// 최소 스텁만 둔다. 과한 전역 모킹은 의도적으로 피한다.

// jsdom 의 localStorage 는 환경에 따라 setItem 등이 없을 수 있다.
// persist 미들웨어를 쓰는 스토어(cells/presets) 테스트를 위해
// 동기 in-memory 구현으로 대체한다.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
for (const target of [globalThis, globalThis.window].filter(Boolean)) {
  Object.defineProperty(target, "localStorage", {
    value: memoryStorage,
    writable: true,
    configurable: true,
  });
}
