import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Falls back to the real deployed backend in production builds if
// VITE_API_URL isn't set in Vercel's dashboard -- so the site still works
// even if that step gets missed. Local `npm run dev` still defaults to
// localhost so this doesn't break normal local development. Still set
// VITE_API_URL explicitly when you have a different/staging backend; this
// is just a safety net, not a replacement.
export const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://4saesonbackend.vercel.app" : "http://localhost:8000");

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);

// FastAPI's error shape is NOT always a plain string: custom HTTPException
// raises give a string `detail`, but Pydantic validation failures (422 --
// bad phone format, weak password, etc.) return `detail` as an ARRAY of
// error objects instead. Every catch block in this app used to do
// `push(err.response?.data?.detail || fallback, "error")` directly -- the
// moment a 422 array hit that toast, React tried to render an object as a
// text child and crashed the whole page white with no error boundary to
// catch it. This is the one place that should ever read err.response.data.
export function getErrorMessage(err, fallback = "حصل خطأ، جرب تاني") {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    let msg = typeof first === "string" ? first : first?.msg;
    if (typeof msg === "string") {
      msg = msg.replace(/^Value error,\s*/i, "").trim();
      // Raw Pydantic type/pattern messages are English internals ("String
      // should match pattern...") that don't help a customer -- only surface
      // messages that are actually our own (Arabic) validator text.
      if (msg && /[\u0600-\u06FF]/.test(msg)) return msg;
    }
  }
  return fallback;
}

export default api;
