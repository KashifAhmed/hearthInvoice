import type { Invoice } from "@/types";

export type Route =
  | { name: "dashboard" }
  | { name: "invoices" }
  | { name: "clients" }
  | { name: "settings" }
  | { name: "invoice-new" }
  | { name: "invoice-edit"; invoice: Invoice };

export type NavRoute = "dashboard" | "invoices" | "clients" | "settings";
