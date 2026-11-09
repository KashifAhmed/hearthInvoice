export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface Client {
  id: number;
  name: string;
  email: string;
  address: string;
  phone: string;
  note: string;
  created_at?: string;
}

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Invoice {
  id: number;
  number: string;
  client_id: number | null;
  client?: Client | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  tax_rate: number;
  discount: number;
  notes: string;
  currency: string;
  created_at?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface InvoiceInput {
  id?: number;
  number?: string;
  client_id: number | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  tax_rate: number;
  discount: number;
  notes: string;
  currency: string;
  items: InvoiceItem[];
}

export interface Settings {
  business_name: string;
  business_address: string;
  business_email: string;
  business_phone: string;
  business_tax_id: string;
  invoice_prefix: string;
  currency: string;
  invoice_footer: string;
}

export interface DashboardStats {
  clients: number;
  invoices: number;
  paid: number;
  outstanding: number;
  currency: string;
}
