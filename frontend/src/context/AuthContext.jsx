import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (err) {
      // 401 on first load is expected for unauthenticated visitors.
      // Anything else is worth surfacing while debugging.
      if (err?.response?.status && err.response.status !== 401) {
        console.warn("[auth] /me failed:", err.response.status);
      }
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Handle Emergent Google OAuth callback (session_id in hash)
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (m) {
      api.post("/auth/google", { session_id: m[1] })
        .then(({ data }) => {
          localStorage.setItem("ce_token", data.token);
          setUser(data.user);
          window.history.replaceState(null, "", window.location.pathname);
        })
        .catch(err => console.warn("[auth] google exchange failed:", err?.response?.status))
        .finally(() => refresh());
    } else {
      refresh();
    }
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("ce_token", data.token);
    setUser(data.user); return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("ce_token", data.token);
    setUser(data.user); return data.user;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); }
    catch (err) { console.warn("[auth] logout endpoint failed:", err?.response?.status); }
    localStorage.removeItem("ce_token"); setUser(null);
  };
  const startGoogle = () => {
    const redirect = `${window.location.origin}/auth`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, startGoogle, refresh, setUser }}>{children}</AuthCtx.Provider>;
}
