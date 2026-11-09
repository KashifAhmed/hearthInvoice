import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/app/sidebar";
import { PreviewDialog } from "@/components/app/preview-dialog";
import { Toaster } from "@/components/ui/sonner";
import { api, errorMessage } from "@/lib/api";
import type { NavRoute, Route } from "@/lib/routes";
import { ClientsView } from "@/views/clients";
import { DashboardView } from "@/views/dashboard";
import { InvoicesView } from "@/views/invoices";
import { InvoiceEditorView } from "@/views/invoice-editor";
import { SettingsView } from "@/views/settings";
import type { Invoice } from "@/types";

function activeNav(route: Route): NavRoute {
  if (route.name === "invoice-new" || route.name === "invoice-edit") return "invoices";
  return route.name;
}

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "dashboard" });
  const [preview, setPreview] = useState<{ invoice: Invoice; html: string } | null>(null);

  const navigate = useCallback((name: NavRoute) => setRoute({ name } as Route), []);
  const newInvoice = useCallback(() => setRoute({ name: "invoice-new" }), []);
  const openInvoice = useCallback(
    (invoice: Invoice) => setRoute({ name: "invoice-edit", invoice }),
    []
  );

  const previewInvoice = useCallback(async (invoice: Invoice) => {
    try {
      const html = await api.invoices.previewHtml(invoice.id);
      setPreview({ invoice, html });
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, []);

  const exportPdf = useCallback(async (invoice: Invoice) => {
    try {
      const res = await api.invoices.exportPdf(invoice.id);
      if (res.ok && res.path) {
        const path = res.path;
        toast.success("PDF saved", {
          description: path,
          action: { label: "Show", onClick: () => void api.shell.showItem(path) },
        });
      } else if (!res.canceled) {
        toast.error("Could not export PDF");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    window.__setView = (view) => {
      setPreview(null);
      if (view === "invoice-new") {
        setRoute({ name: "invoice-new" });
      } else if (["dashboard", "invoices", "clients", "settings"].includes(view)) {
        setRoute({ name: view as NavRoute } as Route);
      } else if (view === "invoice-edit" || view === "invoice-preview") {
        void api.invoices.list().then((list) => {
          const invoice = list[0];
          if (!invoice) return;
          if (view === "invoice-edit") setRoute({ name: "invoice-edit", invoice });
          else void previewInvoice(invoice);
        });
      }
    };
    return () => {
      delete window.__setView;
    };
  }, [previewInvoice]);

  let content: ReactNode;
  switch (route.name) {
    case "dashboard":
      content = (
        <DashboardView
          onNewInvoice={newInvoice}
          onViewAll={() => navigate("invoices")}
          onOpenInvoice={openInvoice}
          onPreview={previewInvoice}
          onPdf={exportPdf}
        />
      );
      break;
    case "invoices":
      content = (
        <InvoicesView
          onNewInvoice={newInvoice}
          onOpenInvoice={openInvoice}
          onPreview={previewInvoice}
          onPdf={exportPdf}
        />
      );
      break;
    case "clients":
      content = <ClientsView />;
      break;
    case "settings":
      content = <SettingsView />;
      break;
    case "invoice-new":
      content = (
        <InvoiceEditorView
          key="new"
          onBack={() => navigate("invoices")}
          onSaved={(invoice) => setRoute({ name: "invoice-edit", invoice })}
          onDeleted={() => navigate("invoices")}
          onPreview={previewInvoice}
          onPdf={exportPdf}
        />
      );
      break;
    case "invoice-edit":
      content = (
        <InvoiceEditorView
          key={route.invoice.id}
          invoice={route.invoice}
          onBack={() => navigate("invoices")}
          onSaved={(invoice) => setRoute({ name: "invoice-edit", invoice })}
          onDeleted={() => navigate("invoices")}
          onPreview={previewInvoice}
          onPdf={exportPdf}
        />
      );
      break;
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar active={activeNav(route)} onNavigate={navigate} />
      <main className="flex min-w-0 flex-1 flex-col">{content}</main>

      <PreviewDialog
        invoice={preview?.invoice ?? null}
        html={preview?.html ?? ""}
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onExport={exportPdf}
      />

      <Toaster />
    </div>
  );
}
