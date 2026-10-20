/** localStorage that never throws: it can be blocked (private mode, policies) or full, and the app must work without it. */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* the value just won't persist */
    }
  },
};
