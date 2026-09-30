/**
 * Cliente da API do Worker. Mesma origem, então a sessão viaja no cookie
 * httpOnly — nenhum token fica em localStorage, onde qualquer script da página
 * poderia lê-lo.
 */

import type { SiteConfig } from "@/config/site.config";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers ?? {}),
    },
  });

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(response.status, "Resposta inesperada do servidor.");
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Erro ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return payload as T;
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type AdminUser = { id: string; email: string; name: string };

export type MediaItem = {
  key: string;
  url: string;
  filename: string;
  contentType: string;
  size: number;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  alt: string | null;
  createdAt: number;
};

export type Lead = {
  id: string;
  name: string;
  contact: string;
  contactKind: "phone" | "email";
  replyUrl: string;
  subject: string | null;
  message: string;
  status: "new" | "read" | "archived";
  consent: boolean;
  country: string | null;
  createdAt: number;
};

export type LeadSummary = { new: number; read: number; archived: number };

/** O conteúdo salvo é sempre um subconjunto do SiteConfig. */
export type StoredContent = Partial<SiteConfig>;

// ─── Autenticação ───────────────────────────────────────────────────────────

export const auth = {
  me: () =>
    request<{ authenticated: boolean; user?: AdminUser }>("/auth/me").catch(
      error => {
        if (error instanceof ApiError && error.status === 401) {
          return { authenticated: false as const };
        }
        throw error;
      }
    ),

  login: (email: string, password: string) =>
    request<{ authenticated: true; user: AdminUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request<{ authenticated: false }>("/auth/logout", { method: "POST" }),
};

// ─── Conteúdo ───────────────────────────────────────────────────────────────

export const content = {
  get: () =>
    request<{ content: StoredContent | null; updatedAt: number | null }>(
      "/content"
    ),

  save: (data: StoredContent) =>
    request<{ ok: true; updatedAt: number }>("/content", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ─── Mídia ──────────────────────────────────────────────────────────────────

export const media = {
  list: (kind?: "image" | "video") =>
    request<{ media: MediaItem[] }>(`/media${kind ? `?kind=${kind}` : ""}`),

  upload: (
    file: File | Blob,
    meta: { filename: string; width?: number; height?: number; alt?: string }
  ) => {
    const form = new FormData();
    form.append("file", file, meta.filename);
    if (meta.width) form.append("width", String(meta.width));
    if (meta.height) form.append("height", String(meta.height));
    if (meta.alt) form.append("alt", meta.alt);
    return request<MediaItem>("/media", { method: "POST", body: form });
  },

  remove: (key: string) =>
    request<{ ok: true }>(`/media/${encodeURIComponent(key)}`, {
      method: "DELETE",
    }),
};

// ─── Leads ──────────────────────────────────────────────────────────────────

export const leads = {
  list: (status?: Lead["status"]) =>
    request<{ leads: Lead[]; summary: LeadSummary }>(
      `/leads${status ? `?status=${status}` : ""}`
    ),

  setStatus: (id: string, status: Lead["status"]) =>
    request<{ ok: true }>(`/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  remove: (id: string) =>
    request<{ ok: true }>(`/leads/${id}`, { method: "DELETE" }),

  exportUrl: "/api/leads/export",

  submit: (payload: {
    name: string;
    contact: string;
    subject: string;
    message: string;
    consent: boolean;
    elapsedMs: number;
    website?: string;
    sourcePath: string;
  }) =>
    request<{ ok: true; id: string }>("/leads", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
