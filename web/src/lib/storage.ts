export const storage = {
  get: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch {}
  },
  remove: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
  },
  getJSON: <T>(key: string): T | null => {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : null;
    } catch { return null; }
  },
  setJSON: <T>(key: string, value: T): void => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
};
