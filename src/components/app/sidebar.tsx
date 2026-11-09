import {
  FileText,
  LayoutDashboard,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { NavRoute } from "@/lib/routes";

const NAV: { name: NavRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { name: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { name: "invoices", label: "Invoices", icon: FileText },
  { name: "clients", label: "Clients", icon: Users },
  { name: "settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({
  active,
  onNavigate,
}: {
  active: NavRoute;
  onNavigate: (route: NavRoute) => void;
}) {
  const { theme, toggle } = useTheme();

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-60 shrink-0 flex-col border-r">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-sm font-bold">
          FI
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Freelancer</p>
          <p className="text-muted-foreground text-xs">Invoice</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.name;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onNavigate(item.name)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 px-3 pb-4">
        <div className="border-sidebar-border flex items-center gap-2 rounded-md border px-3 py-2">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground text-xs">Offline · local data</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={toggle}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </Button>
      </div>
    </aside>
  );
}
