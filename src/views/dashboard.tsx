import { useEffect, useState } from "react";
import { ArrowRight, CircleCheck, Clock, FileText, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/app/page";
import { StatCard } from "@/components/app/stat-card";
import { InvoiceTable } from "@/components/app/invoice-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/lib/api";
import type { DashboardStats, Invoice } from "@/types";

export function DashboardView({
  onNewInvoice,
  onViewAll,
  onOpenInvoice,
  onPreview,
  onPdf,
}: {
  onNewInvoice: () => void;
  onViewAll: () => void;
  onOpenInvoice: (invoice: Invoice) => void;
  onPreview: (invoice: Invoice) => void;
  onPdf: (invoice: Invoice) => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.dashboard.stats(), api.invoices.list()])
      .then(([s, list]) => {
        if (!alive) return;
        setStats(s);
        setInvoices(list.slice(0, 6));
      })
      .catch((err) => toast.error(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Page
      title="Dashboard"
      description="A quick look at your freelance billing."
      actions={
        <Button onClick={onNewInvoice}>
          <Plus className="size-4" /> New invoice
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats ? (
          <>
            <StatCard label="Clients" value={stats.clients} icon={Users} />
            <StatCard label="Invoices" value={stats.invoices} icon={FileText} />
            <StatCard label="Paid" value={stats.paid} hint="Marked as paid" icon={CircleCheck} />
            <StatCard
              label="Unpaid"
              value={stats.outstanding}
              hint="Draft, sent or overdue"
              icon={Clock}
              accent
            />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))
        )}
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold">Recent invoices</p>
            <p className="text-muted-foreground text-xs">Your latest activity</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            View all <ArrowRight className="size-4" />
          </Button>
        </div>
        {invoices ? (
          <InvoiceTable
            invoices={invoices}
            onOpen={onOpenInvoice}
            onPreview={onPreview}
            onPdf={onPdf}
            onNew={onNewInvoice}
          />
        ) : (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
