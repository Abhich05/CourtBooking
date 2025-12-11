import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, getStoredUser, clearTokens, getCurrentUser, login as apiLogin, register as apiRegister, logout as apiLogout, LoginData, RegisterData } from './api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: getStoredUser(),
      isAuthenticated: !!getStoredUser(),
      isLoading: false,
      error: null,

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiLogin(data);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await apiRegister(data);
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message :
            (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Registration failed';
          set({ error: errorMessage, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        apiLogout();
        clearTokens();
        set({ user: null, isAuthenticated: false, error: null });
      },

      checkAuth: async () => {
        const storedUser = getStoredUser();
        if (!storedUser) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        
        try {
          const user = await getCurrentUser();
          set({ user, isAuthenticated: true });
        } catch {
          clearTokens();
          set({ user: null, isAuthenticated: false });
        }
      },

      clearError: () => set({ error: null }),
      
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Theme store for dark mode
interface ThemeState {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
        return { isDarkMode: newMode };
      }),
      setDarkMode: (isDark: boolean) => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        set({ isDarkMode: isDark });
      }
    }),
    {
      name: 'theme-storage',
    }
  )
);
