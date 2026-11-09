import type { Client, DashboardStats, Invoice, InvoiceInput, Settings } from "@/types";

interface Api {
  settings: {
    get: () => Promise<Settings>;
    save: (data: Partial<Settings>) => Promise<Settings>;
  };
  clients: {
    list: () => Promise<Client[]>;
    create: (data: Partial<Client>) => Promise<Client>;
    update: (id: number, data: Partial<Client>) => Promise<Client>;
    remove: (id: number) => Promise<void>;
  };
  invoices: {
    list: () => Promise<Invoice[]>;
    get: (id: number) => Promise<Invoice>;
    save: (data: InvoiceInput) => Promise<Invoice>;
    setStatus: (id: number, status: string) => Promise<Invoice>;
    remove: (id: number) => Promise<void>;
    previewHtml: (id: number) => Promise<string>;
    exportPdf: (
      id: number
    ) => Promise<{ ok: boolean; canceled?: boolean; path?: string }>;
  };
  dashboard: { stats: () => Promise<DashboardStats> };
  shell: { showItem: (p: string) => Promise<void> };
}

declare global {
  interface Window {
    api: Api;
    __setView?: (view: string) => void;
    __setTheme?: (theme: "light" | "dark") => void;
  }
}

export {};
