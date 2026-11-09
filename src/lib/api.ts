import type {
  Client,
  DashboardStats,
  Invoice,
  InvoiceInput,
  Settings,
} from "@/types";

const invoke = window.api;

export const api = {
  settings: {
    get: (): Promise<Settings> => invoke.settings.get(),
    save: (data: Partial<Settings>): Promise<Settings> => invoke.settings.save(data),
  },
  clients: {
    list: (): Promise<Client[]> => invoke.clients.list(),
    create: (data: Partial<Client>): Promise<Client> => invoke.clients.create(data),
    update: (id: number, data: Partial<Client>): Promise<Client> =>
      invoke.clients.update(id, data),
    remove: (id: number): Promise<void> => invoke.clients.remove(id),
  },
  invoices: {
    list: (): Promise<Invoice[]> => invoke.invoices.list(),
    get: (id: number): Promise<Invoice> => invoke.invoices.get(id),
    save: (data: InvoiceInput): Promise<Invoice> => invoke.invoices.save(data),
    setStatus: (id: number, status: string): Promise<Invoice> =>
      invoke.invoices.setStatus(id, status),
    remove: (id: number): Promise<void> => invoke.invoices.remove(id),
    previewHtml: (id: number): Promise<string> => invoke.invoices.previewHtml(id),
    exportPdf: (
      id: number
    ): Promise<{ ok: boolean; canceled?: boolean; path?: string }> =>
      invoke.invoices.exportPdf(id),
  },
  dashboard: {
    stats: (): Promise<DashboardStats> => invoke.dashboard.stats(),
  },
  shell: {
    showItem: (p: string): Promise<void> => invoke.shell.showItem(p),
  },
};

export function errorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("UNIQUE constraint failed: invoices.number")) {
    return "That invoice number already exists. Use a different number.";
  }
  return msg;
}
