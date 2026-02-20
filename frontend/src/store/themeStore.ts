import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      setTheme: (theme) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
        set({ theme: newTheme });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on page load
        if (state) {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(state.theme);
        }
      },
    }
  )
);
