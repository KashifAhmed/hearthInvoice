import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Eye,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/app/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import { formatDate, money, today } from "@/lib/format";
import type { Client, Invoice, InvoiceInput, InvoiceStatus, Settings } from "@/types";

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

interface ItemDraft {
  description: string;
  quantity: string;
  unit_price: string;
}

interface FormState {
  number: string;
  client_id: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  currency: string;
  tax_rate: string;
  discount: string;
  notes: string;
  items: ItemDraft[];
}

const newItem = (): ItemDraft => ({ description: "", quantity: "1", unit_price: "0" });

function initialState(invoice?: Invoice, settings?: Settings | null): FormState {
  return {
    number: invoice?.number ?? "",
    client_id: invoice?.client_id ? String(invoice.client_id) : "none",
    issue_date: invoice?.issue_date ?? today(),
    due_date: invoice?.due_date ?? "",
    status: invoice?.status ?? "draft",
    currency: invoice?.currency ?? settings?.currency ?? "USD",
    tax_rate: String(invoice?.tax_rate ?? 0),
    discount: String(invoice?.discount ?? 0),
    notes: invoice?.notes ?? "",
    items:
      invoice?.items?.length && invoice.items.length > 0
        ? invoice.items.map((it) => ({
            description: it.description,
            quantity: String(it.quantity),
            unit_price: String(it.unit_price),
          }))
        : [newItem()],
  };
}

export function InvoiceEditorView({
  invoice,
  onBack,
  onSaved,
  onDeleted,
  onPreview,
  onPdf,
}: {
  invoice?: Invoice;
  onBack: () => void;
  onSaved: (invoice: Invoice) => void;
  onDeleted: () => void;
  onPreview: (invoice: Invoice) => void;
  onPdf: (invoice: Invoice) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<FormState>(() => initialState(invoice));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEdit = Boolean(invoice?.id);

  useEffect(() => {
    let alive = true;
    Promise.all([api.clients.list(), api.settings.get()])
      .then(([clientList, s]) => {
        if (!alive) return;
        setClients(clientList);
        setSettings(s);
        setForm((prev) =>
          prev.number || isEdit ? prev : { ...prev, currency: prev.currency || s.currency }
        );
      })
      .catch((err) => toast.error(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [isEdit]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateItem = (index: number, patch: Partial<ItemDraft>) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));

  const addItem = () =>
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem()] }));

  const removeItem = (index: number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((_, i) => i !== index) : prev.items,
    }));

  const totals = useMemo(() => {
    const subtotal = form.items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
      0
    );
    const discount = Number(form.discount) || 0;
    const taxRate = Number(form.tax_rate) || 0;
    const tax = Math.max(0, subtotal - discount) * (taxRate / 100);
    const total = Math.max(0, subtotal - discount + tax);
    return { subtotal, discount, taxRate, tax, total };
  }, [form.items, form.discount, form.tax_rate]);

  const save = async () => {
    const items = form.items
      .filter((it) => it.description.trim())
      .map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 0,
        unit_price: Number(it.unit_price) || 0,
      }));
    if (items.length === 0) {
      toast.error("Add at least one line item with a description");
      return;
    }

    const payload: InvoiceInput = {
      id: invoice?.id,
      ...(form.number.trim() ? { number: form.number.trim() } : {}),
      client_id: form.client_id === "none" ? null : Number(form.client_id),
      issue_date: form.issue_date || today(),
      due_date: form.due_date,
      status: form.status,
      currency: form.currency.trim() || "USD",
      tax_rate: Number(form.tax_rate) || 0,
      discount: Number(form.discount) || 0,
      notes: form.notes,
      items,
    };

    setSaving(true);
    try {
      const saved = await api.invoices.save(payload);
      toast.success(`Invoice ${saved.number} saved`);
      onSaved(saved);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    if (!invoice) return;
    try {
      await api.invoices.remove(invoice.id);
      toast.success(`Invoice ${invoice.number} deleted`);
      onDeleted();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const title = isEdit ? `Invoice ${invoice?.number}` : "New invoice";

  return (
    <Page
      title={title}
      description={isEdit ? `Issued ${formatDate(invoice?.issue_date ?? "")}` : "Draft a new invoice for a client."}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {isEdit && invoice ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onPreview(invoice)}>
                <Eye className="size-4" /> Preview
              </Button>
              <Button variant="outline" size="sm" onClick={() => onPdf(invoice)}>
                <Download className="size-4" /> PDF
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setConfirmDelete(true)}
                aria-label="Delete invoice"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          ) : null}
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="size-4" /> {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="invoice-number">Invoice number</Label>
                <Input
                  id="invoice-number"
                  value={form.number}
                  onChange={(e) => set("number", e.target.value)}
                  placeholder={`auto (${settings?.invoice_prefix ?? "INV-"}0001)`}
                />
              </div>
              <div className="grid gap-2">
                <Label>Client</Label>
                <Select
                  value={form.client_id}
                  onValueChange={(v) => set("client_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-issue">Issue date</Label>
                <Input
                  id="invoice-issue"
                  type="date"
                  value={form.issue_date}
                  onChange={(e) => set("issue_date", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-due">Due date</Label>
                <Input
                  id="invoice-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => set("due_date", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => set("status", v as InvoiceStatus)}
                >
                  <SelectTrigger className="capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status} className="capitalize">
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-currency">Currency</Label>
                <Input
                  id="invoice-currency"
                  value={form.currency}
                  maxLength={8}
                  onChange={(e) => set("currency", e.target.value.toUpperCase())}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Line items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="size-4" /> Add item
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_72px_104px_96px_32px] gap-2 px-1 text-xs font-medium uppercase tracking-wide sm:grid">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit price</span>
                <span className="text-right">Amount</span>
                <span />
              </div>
              {form.items.map((item, index) => {
                const amount =
                  (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_72px_104px_96px_32px] sm:items-center"
                  >
                    <Input
                      aria-label="Description"
                      placeholder="Description of work"
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                    />
                    <Input
                      aria-label="Quantity"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    />
                    <Input
                      aria-label="Unit price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, { unit_price: e.target.value })}
                    />
                    <span className="text-muted-foreground pr-1 text-right text-sm tabular-nums sm:text-foreground">
                      {money(amount, form.currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground justify-self-end"
                      onClick={() => removeItem(index)}
                      aria-label="Remove line item"
                      disabled={form.items.length === 1}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Payment terms, bank details, thank-you note…"
                rows={4}
              />
              <p className="text-muted-foreground mt-2 text-xs">
                Shown at the bottom of the invoice.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-0">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="invoice-tax">Tax rate (%)</Label>
                <Input
                  id="invoice-tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.tax_rate}
                  onChange={(e) => set("tax_rate", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invoice-discount">Discount ({form.currency})</Label>
                <Input
                  id="invoice-discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discount}
                  onChange={(e) => set("discount", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{money(totals.subtotal, form.currency)}</span>
              </div>
              {totals.discount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="tabular-nums">
                    -{money(totals.discount, form.currency)}
                  </span>
                </div>
              ) : null}
              {totals.taxRate > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax ({totals.taxRate}%)</span>
                  <span className="tabular-nums">{money(totals.tax, form.currency)}</span>
                </div>
              ) : null}
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(totals.total, form.currency)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={save} disabled={saving}>
              <Save className="size-4" /> {saving ? "Saving…" : "Save invoice"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {invoice?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice and its line items. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={destroy}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
