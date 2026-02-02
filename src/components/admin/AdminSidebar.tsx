import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Leaf,
  FolderTree,
  Truck,
  Settings,
  ArrowLeft,
  Package,
} from "lucide-react";

const navItems = [
  { path: "/admin", icon: LayoutDashboard, label: "admin.dashboard" },
  { path: "/admin/plants", icon: Leaf, label: "admin.plants" },
  { path: "/admin/categories", icon: FolderTree, label: "admin.categories" },
  { path: "/admin/orders", icon: Package, label: "admin.orders" },
  { path: "/admin/shipping", icon: Truck, label: "admin.shipping" },
  { path: "/admin/settings", icon: Settings, label: "admin.settings" },
];

export function AdminSidebar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Fronda Prima</h1>
        <p className="text-sm text-muted-foreground">Panel de Administración</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-moss/10 text-moss"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {t(item.label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a la tienda
        </Link>
      </div>
    </aside>
  );
}
