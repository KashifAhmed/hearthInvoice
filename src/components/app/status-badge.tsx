import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/types";

const STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground border-transparent",
  sent: "bg-accent text-accent-foreground border-transparent",
  paid: "bg-emerald-500/15 text-emerald-700 border-transparent dark:text-emerald-400",
  overdue: "bg-destructive/10 text-destructive border-transparent",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge className={cn("capitalize", STYLES[status] ?? STYLES.draft)}>{status}</Badge>
  );
}
