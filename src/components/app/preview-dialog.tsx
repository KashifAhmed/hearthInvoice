import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Invoice } from "@/types";

export function PreviewDialog({
  invoice,
  html,
  open,
  onOpenChange,
  onExport,
}: {
  invoice: Invoice | null;
  html: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (invoice: Invoice) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="flex-row items-center justify-between gap-4 border-b px-6 py-4">
          <div className="space-y-1 text-left">
            <DialogTitle>Invoice {invoice?.number}</DialogTitle>
            <DialogDescription>Preview of the saved invoice.</DialogDescription>
          </div>
          {invoice ? (
            <Button size="sm" className="mr-8" onClick={() => onExport(invoice)}>
              <Download className="size-4" />
              Export PDF
            </Button>
          ) : null}
        </DialogHeader>
        <div className="bg-muted/40 max-h-[74vh] overflow-y-auto p-4">
          <iframe
            title="Invoice preview"
            sandbox=""
            srcDoc={html}
            className="mx-auto h-[70vh] w-full max-w-[820px] rounded-md border bg-white shadow-sm"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
