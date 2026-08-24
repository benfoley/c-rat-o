import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'

// Node 20+'s built-in `localStorage` global can shadow jsdom's real
// implementation with a non-functional stub (getItem/setItem missing).
// Swap in a minimal in-memory Storage so tests that use localStorage work
// regardless of which Node version runs them. Real browsers are unaffected.
if (typeof window !== 'undefined' && typeof window.localStorage?.getItem !== 'function') {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>()
    get length() {
      return this.store.size
    }
    clear() {
      this.store.clear()
    }
    getItem(key: string) {
      return this.store.has(key) ? this.store.get(key)! : null
    }
    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null
    }
    removeItem(key: string) {
      this.store.delete(key)
    }
    setItem(key: string, value: string) {
      this.store.set(key, String(value))
    }
  }
  const memoryStorage = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', { value: memoryStorage, configurable: true })
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true })
}
