import { create } from "zustand";
import { Session } from "next-auth";

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ isLoading: loading }),
  isAuthenticated: () => {
    const { session } = get();
    return session !== null && !!session.user;
  },
}));

