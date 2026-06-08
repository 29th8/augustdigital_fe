import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserProfile } from "@/types/auth";
import { setAuthCookie, clearAuthCookie, setRoleCookie, clearRoleCookie } from "@/lib/cookie";

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  setAuth: (token: string, user: UserProfile) => void;
  updateUser: (user: UserProfile) => void;
  logout: () => void;
}

// SSR-safe storage: returns a noop implementation when window is not available
// so the store initialises cleanly during server rendering and hydrates on the client.
const ssrSafeLocalStorage = createJSONStorage(() => {
  if (typeof window === "undefined") {
    return {
      getItem: (_key: string) => null,
      setItem: (_key: string, _value: string) => {},
      removeItem: (_key: string) => {},
    };
  }
  return localStorage;
});

const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        setAuthCookie(token);
        setRoleCookie(user.role); // lets proxy enforce /admin without JWT decode
        set({ token, user, isAuthenticated: true });
      },

      updateUser: (user) => {
        set({ user });
      },

      logout: () => {
        clearAuthCookie();
        clearRoleCookie();
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      storage: ssrSafeLocalStorage,
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
