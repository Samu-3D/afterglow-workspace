/**
 * AFTERGLOW — API Client
 * Drop this file into your React app at: src/api.js
 *
 * Usage:
 *   import api from "./api";
 *   const { tasks } = await api.tasks.getAll();
 *   await api.tasks.sync(localTasksArray);
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// In Vite, add to .env:  VITE_API_URL=https://your-backend.onrender.com
const BASE_URL = "https://afterglow-backend.onrender.com";

// ─── TOKEN STORAGE ───────────────────────────────────────────────────────────
const TOKEN_KEY = "afterglow_jwt";
export const getToken  = ()      => localStorage.getItem(TOKEN_KEY);
export const setToken  = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = ()     => localStorage.removeItem(TOKEN_KEY);

// ─── BASE FETCH ──────────────────────────────────────────────────────────────
const req = async (method, path, body = null) => {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    // Token expired → clear and reload to show login
    if (res.status === 401) {
      clearToken();
      window.location.reload();
    }
    throw new Error(data.message || `API error ${res.status}`);
  }
  return data;
};

const get    = (path)        => req("GET",    path);
const post   = (path, body)  => req("POST",   path, body);
const put    = (path, body)  => req("PUT",    path, body);
const del    = (path)        => req("DELETE", path);
const patch  = (path, body)  => req("PATCH",  path, body);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const auth = {
  /** Returns { token, user } */
  login: async (email, password) => {
    const data = await post("/api/auth/login", { email, password });
    if (data.token) setToken(data.token);
    return data;
  },
  me: ()                       => get("/api/auth/me"),
  changePassword: (currentPassword, newPassword) =>
    patch("/api/auth/password", { currentPassword, newPassword }),
  logout: () => { clearToken(); window.location.reload(); },
};

// ─── TASKS ───────────────────────────────────────────────────────────────────
const tasks = {
  getAll:    ()        => get("/api/tasks"),
  create:    (task)    => post("/api/tasks", task),
  update:    (id, data)=> put(`/api/tasks/${encodeURIComponent(id)}`, data),
  remove:    (id)      => del(`/api/tasks/${encodeURIComponent(id)}`),
  /** Push full local task array to server (upserts all) */
  sync:      (arr)     => post("/api/tasks/sync", { tasks: arr }),
  clearDone: ()        => del("/api/tasks/clear-done"),
};

// ─── SETTINGS ────────────────────────────────────────────────────────────────
const settings = {
  get:  ()       => get("/api/settings"),
  save: (payload)=> put("/api/settings", { settings: payload }),
};

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
const documents = {
  getAll: ()          => get("/api/documents"),
  create: (doc)       => post("/api/documents", doc),
  update: (id, data)  => put(`/api/documents/${encodeURIComponent(id)}`, data),
  remove: (id)        => del(`/api/documents/${encodeURIComponent(id)}`),
  sync:   (arr)       => post("/api/documents/sync", { documents: arr }),
};

// ─── MONEY ───────────────────────────────────────────────────────────────────
const money = {
  // Ledger
  getLedger:  (from, to) => get(`/api/money/ledger${from ? `?from=${from}&to=${to}` : ""}`),
  saveEntry:  (date, entry) => put(`/api/money/ledger/${date}`, entry),
  syncLedger: (entries) => post("/api/money/ledger/sync", { entries }),

  // Purchases
  getPurchases:   ()          => get("/api/money/purchases"),
  savePurchase:   (id, data)  => put(`/api/money/purchases/${encodeURIComponent(id)}`, data),
  deletePurchase: (id)        => del(`/api/money/purchases/${encodeURIComponent(id)}`),
  syncPurchases:  (arr)       => post("/api/money/purchases/sync", { purchases: arr }),

  // Future Goals
  getGoals:   ()          => get("/api/money/goals"),
  saveGoal:   (id, data)  => put(`/api/money/goals/${encodeURIComponent(id)}`, data),
  deleteGoal: (id)        => del(`/api/money/goals/${encodeURIComponent(id)}`),
  syncGoals:  (arr)       => post("/api/money/goals/sync", { goals: arr }),

  // ITSINDA
  getItsinda:  ()       => get("/api/money/itsinda"),
  saveItsinda: (data)   => put("/api/money/itsinda", data),
  markPaid:    (date, amount, note) =>
    post("/api/money/itsinda/pay", { date, amount, note }),
};

// ─── REPORTS ─────────────────────────────────────────────────────────────────
const reports = {
  getDailyReports:  () => get("/api/reports/daily"),
  saveDailyReport:  (date, payload) => put(`/api/reports/daily/${date}`, { payload }),
  syncDailyReports: (arr) => post("/api/reports/daily/sync", { reports: arr }),

  getEndDayReviews:  () => get("/api/reports/endday"),
  saveEndDayReview:  (date, payload) => put(`/api/reports/endday/${date}`, { payload }),
  syncEndDayReviews: (arr) => post("/api/reports/endday/sync", { reviews: arr }),
};

// ─── BACKUP ───────────────────────────────────────────────────────────────────
const backup = {
  export: () => get("/api/backup/export"),
  import: (data) => post("/api/backup/import", data),
};

// ─── HEALTH ───────────────────────────────────────────────────────────────────
const health = () => get("/health");

const api = { auth, tasks, settings, documents, money, reports, backup, health };
export default api;
