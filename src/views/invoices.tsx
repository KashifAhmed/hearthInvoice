import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/app/page";
import { InvoiceTable } from "@/components/app/invoice-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "@/lib/api";
import type { Invoice, InvoiceStatus } from "@/types";

type Filter = "all" | InvoiceStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export function InvoicesView({
  onNewInvoice,
  onOpenInvoice,
  onPreview,
  onPdf,
}: {
  onNewInvoice: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onPreview: (invoice: Invoice) => void;
  onPdf: (invoice: Invoice) => void;
}) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = () => {
    api.invoices
      .list()
      .then(setInvoices)
      .catch((err) => toast.error(errorMessage(err)));
  };

  useEffect(load, []);

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: invoices?.length ?? 0,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
    };
    for (const inv of invoices ?? []) base[inv.status] += 1;
    return base;
  }, [invoices]);

  const filtered = useMemo(
    () => (invoices ?? []).filter((inv) => filter === "all" || inv.status === filter),
    [invoices, filter]
  );

  const handleDelete = async (invoice: Invoice) => {
    try {
      await api.invoices.remove(invoice.id);
      toast.success(`Invoice ${invoice.number} deleted`);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Page
      title="Invoices"
      description="Create, review and export invoices for your clients."
      actions={
        <Button onClick={onNewInvoice}>
          <Plus className="size-4" /> New invoice
        </Button>
      }
    >
      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              <span className="text-muted-foreground text-xs tabular-nums">
                {counts[f.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="mt-4 overflow-hidden">
        {invoices ? (
          <InvoiceTable
            invoices={filtered}
            onOpen={onOpenInvoice}
            onPreview={onPreview}
            onPdf={onPdf}
            onDelete={handleDelete}
            onNew={onNewInvoice}
          />
        ) : (
          <div className="space-y-2 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
