import axios from "axios";
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("ce_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const fileUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/api/files/")) return `${BACKEND_URL}${url}`;
  return url;
};

export const formatErr = (e) => {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(x => x?.msg || JSON.stringify(x)).join(" ");
  return String(d);
};
