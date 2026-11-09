import { useEffect, useState } from "react";
import { Mail, MoreHorizontal, Pencil, Phone, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/app/page";
import { EmptyState } from "@/components/app/empty-state";
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
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import type { Client } from "@/types";

const EMPTY: Partial<Client> = {
  name: "",
  email: "",
  phone: "",
  address: "",
  note: "",
};

function ClientDialog({
  open,
  client,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  client: Client | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Partial<Client>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(client ? { ...client } : { ...EMPTY });
  }, [open, client]);

  const set = (
    key: "name" | "email" | "phone" | "address" | "note",
    value: string
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.name?.trim()) {
      toast.error("Client name is required");
      return;
    }
    setSaving(true);
    try {
      if (client) await api.clients.update(client.id, form);
      else await api.clients.create(form);
      toast.success(client ? "Client updated" : "Client created");
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            These details appear on invoices you create for this client.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="client-name">Name *</Label>
            <Input
              id="client-name"
              value={form.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Acme Studio"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
                placeholder="billing@acme.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client-phone">Phone</Label>
              <Input
                id="client-phone"
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-address">Address</Label>
            <Textarea
              id="client-address"
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Street, city, country"
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="client-note">Tax / VAT ID (optional)</Label>
            <Input
              id="client-note"
              value={form.note ?? ""}
              onChange={(e) => set("note", e.target.value)}
              placeholder="VAT-123456"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : client ? "Save changes" : "Create client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientsView() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

  const load = () => {
    api.clients
      .list()
      .then(setClients)
      .catch((err) => toast.error(errorMessage(err)));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (client: Client) => {
    setEditing(client);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.clients.remove(pendingDelete.id);
      toast.success("Client deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Page
      title="Clients"
      description="The people and businesses you invoice."
      actions={
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add client
        </Button>
      }
    >
      <Card className="overflow-hidden">
        {clients === null ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No clients yet"
            description="Add a client to start creating invoices for them."
            action={
              <Button size="sm" onClick={openNew}>
                Add client
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Address</TableHead>
                <TableHead>Tax ID</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="text-muted-foreground flex flex-col gap-0.5 text-xs">
                      {client.email ? (
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3" /> {client.email}
                        </span>
                      ) : null}
                      {client.phone ? (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3" /> {client.phone}
                        </span>
                      ) : null}
                      {!client.email && !client.phone ? "—" : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-[220px] truncate lg:table-cell">
                    {client.address || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.note || "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground"
                          aria-label="Client actions"
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => openEdit(client)}>
                          <Pencil className="size-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setPendingDelete(client)}
                        >
                          <Trash2 className="size-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ClientDialog
        open={dialogOpen}
        client={editing}
        onOpenChange={setDialogOpen}
        onSaved={load}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing invoices keep a copy of this client's details, but the client will no
              longer be selectable for new invoices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}
