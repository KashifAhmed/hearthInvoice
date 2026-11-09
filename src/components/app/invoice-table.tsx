import { useState } from "react";
import { FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/app/empty-state";
import { StatusBadge } from "@/components/app/status-badge";
import { formatDate, money } from "@/lib/format";
import type { Invoice } from "@/types";

export function InvoiceTable({
  invoices,
  onOpen,
  onPreview,
  onPdf,
  onDelete,
  onNew,
}: {
  invoices: Invoice[];
  onOpen: (invoice: Invoice) => void;
  onPreview: (invoice: Invoice) => void;
  onPdf: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onNew?: () => void;
}) {
  const [pending, setPending] = useState<Invoice | null>(null);

  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No invoices yet"
        description="Create your first invoice and it will show up here."
        action={
          onNew ? (
            <Button size="sm" onClick={onNew}>
              New invoice
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Number</TableHead>
            <TableHead>Client</TableHead>
            <TableHead className="hidden lg:table-cell">Issued</TableHead>
            <TableHead className="hidden md:table-cell">Due</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              onClick={() => onOpen(invoice)}
            >
              <TableCell className="font-medium">{invoice.number}</TableCell>
              <TableCell className="text-muted-foreground">
                {invoice.client?.name ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground hidden lg:table-cell">
                {formatDate(invoice.issue_date)}
              </TableCell>
              <TableCell className="text-muted-foreground hidden md:table-cell">
                {invoice.due_date ? formatDate(invoice.due_date) : "—"}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {money(invoice.total, invoice.currency)}
              </TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground"
                      aria-label="Invoice actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onSelect={() => onOpen(invoice)}>
                      <Pencil className="size-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onPreview(invoice)}>
                      <FileText className="size-4" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onPdf(invoice)}>
                      <FileText className="size-4" /> Export PDF
                    </DropdownMenuItem>
                    {onDelete ? (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPending(invoice)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice {pending?.number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the invoice and its line items. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pending && onDelete) onDelete(pending);
                setPending(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
