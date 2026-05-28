import { setActivePinia, createPinia } from 'pinia';
import { useThemeStore } from '../../src/stores/theme.js';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    setActivePinia(createPinia());
  });

  // ── initTheme ─────────────────────────────────────────────────────────────

  describe('initTheme', () => {
    it('sets isDark=true when localStorage has "dark"', () => {
      localStorage.setItem('theme', 'dark');
      const store = useThemeStore();
      store.initTheme();
      expect(store.isDark).toBe(true);
    });

    it('removes data-theme attribute in dark mode', () => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'light');
      const store = useThemeStore();
      store.initTheme();
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });

    it('sets isDark=false when localStorage has "light"', () => {
      localStorage.setItem('theme', 'light');
      const store = useThemeStore();
      store.initTheme();
      expect(store.isDark).toBe(false);
    });

    it('sets data-theme="light" attribute in light mode', () => {
      localStorage.setItem('theme', 'light');
      const store = useThemeStore();
      store.initTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('defaults to light when localStorage is empty', () => {
      const store = useThemeStore();
      store.initTheme();
      expect(store.isDark).toBe(false);
    });
  });

  // ── toggleTheme ───────────────────────────────────────────────────────────

  describe('toggleTheme', () => {
    it('flips isDark from false to true', () => {
      const store = useThemeStore();
      store.isDark = false;
      store.toggleTheme();
      expect(store.isDark).toBe(true);
    });

    it('flips isDark from true to false', () => {
      const store = useThemeStore();
      store.isDark = true;
      store.toggleTheme();
      expect(store.isDark).toBe(false);
    });

    it('persists "dark" to localStorage when switching to dark', () => {
      const store = useThemeStore();
      store.isDark = false;
      store.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('persists "light" to localStorage when switching to light', () => {
      const store = useThemeStore();
      store.isDark = true;
      store.toggleTheme();
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('sets data-theme="light" when switching to light mode', () => {
      const store = useThemeStore();
      store.isDark = true;
      store.toggleTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('removes data-theme attribute when switching to dark mode', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      const store = useThemeStore();
      store.isDark = false;
      store.toggleTheme();
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });
  });
});
