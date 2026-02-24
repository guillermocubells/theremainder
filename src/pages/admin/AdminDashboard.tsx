import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, FolderTree, Package, Truck } from "lucide-react";

interface DashboardStats {
  plantsCount: number;
  categoriesCount: number;
  ordersCount: number;
  shippingZonesCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    plantsCount: 0,
    categoriesCount: 0,
    ordersCount: 0,
    shippingZonesCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [plants, categories, orders, shipping] = await Promise.all([
          supabase.from("plants").select("id", { count: "exact", head: true }),
          supabase.from("categories").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase.from("shipping_zones").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          plantsCount: plants.count || 0,
          categoriesCount: categories.count || 0,
          ordersCount: orders.count || 0,
          shippingZonesCount: shipping.count || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Plantas",
      value: stats.plantsCount,
      icon: Leaf,
      color: "text-success",
      bgColor: "bg-success-muted",
    },
    {
      title: "Categorías",
      value: stats.categoriesCount,
      icon: FolderTree,
      color: "text-warning",
      bgColor: "bg-warning-muted",
    },
    {
      title: "Pedidos",
      value: stats.ordersCount,
      icon: Package,
      color: "text-info",
      bgColor: "bg-info-muted",
    },
    {
      title: "Zonas de Envío",
      value: stats.shippingZonesCount,
      icon: Truck,
      color: "text-highlight",
      bgColor: "bg-highlight-muted",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido al panel de administración de Fronda Prima
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {isLoading ? "-" : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
