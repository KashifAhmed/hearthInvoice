import { useEffect, useState } from "react";
import { HardDrive, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Page } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/api";
import type { Settings } from "@/types";

const EMPTY: Settings = {
  business_name: "",
  business_address: "",
  business_email: "",
  business_phone: "",
  business_tax_id: "",
  invoice_prefix: "INV-",
  currency: "USD",
  invoice_footer: "",
};

export function SettingsView() {
  const [form, setForm] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((s) => setForm({ ...EMPTY, ...s }))
      .catch((err) => toast.error(errorMessage(err)));
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await api.settings.save(form);
      setForm({ ...EMPTY, ...saved });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return (
      <Page title="Settings" description="Your business details and invoice defaults.">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Settings"
      description="Your business details and invoice defaults."
      actions={
        <Button onClick={save} disabled={saving}>
          <Save className="size-4" /> {saving ? "Saving…" : "Save settings"}
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="settings-name">Display / legal name</Label>
              <Input
                id="settings-name"
                value={form.business_name}
                onChange={(e) => set("business_name", e.target.value)}
                placeholder="Kash Studio"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input
                id="settings-email"
                type="email"
                value={form.business_email}
                onChange={(e) => set("business_email", e.target.value)}
                placeholder="hello@yourstudio.com"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="settings-address">Address</Label>
              <Textarea
                id="settings-address"
                value={form.business_address}
                onChange={(e) => set("business_address", e.target.value)}
                placeholder="Street, city, country"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-phone">Phone</Label>
              <Input
                id="settings-phone"
                value={form.business_phone}
                onChange={(e) => set("business_phone", e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-taxid">Tax ID (optional)</Label>
              <Input
                id="settings-taxid"
                value={form.business_tax_id}
                onChange={(e) => set("business_tax_id", e.target.value)}
                placeholder="VAT-123456"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoicing defaults</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="settings-prefix">Invoice number prefix</Label>
              <Input
                id="settings-prefix"
                value={form.invoice_prefix}
                onChange={(e) => set("invoice_prefix", e.target.value)}
                placeholder="INV-"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-currency">Default currency</Label>
              <Input
                id="settings-currency"
                value={form.currency}
                maxLength={8}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="settings-footer">Footer text on invoices</Label>
              <Textarea
                id="settings-footer"
                value={form.invoice_footer}
                onChange={(e) => set("invoice_footer", e.target.value)}
                placeholder="Thank you for your business!"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data &amp; privacy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <HardDrive className="size-4" />
              </span>
              <p className="text-muted-foreground">
                All invoices, clients and settings are stored in a local SQLite database on
                this computer. Nothing is uploaded or synced.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <ShieldCheck className="size-4" />
              </span>
              <p className="text-muted-foreground">
                Fully offline: the app makes no network requests. Back up your data by copying
                the app's data folder.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Page>
  );
}
