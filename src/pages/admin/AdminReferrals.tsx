import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Wallet, Gift, Settings } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  available: "bg-primary/20 text-primary border-primary/30",
  used: "bg-secondary text-secondary-foreground",
  reversed: "bg-destructive/20 text-destructive border-destructive/30",
  expired: "bg-muted text-muted-foreground",
};

const AdminReferrals = () => {
  const [activeTab, setActiveTab] = useState("rewards");

  const { data: rewards = [] } = useQuery({
    queryKey: ["admin-referral-rewards"],
    queryFn: async () => {
      const { data } = await supabase
        .from("referral_rewards")
        .select("*, orders(order_number)")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ["admin-wallets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("*, profiles(full_name, email)")
        .order("available_balance", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: settings = [], refetch: refetchSettings } = useQuery({
    queryKey: ["admin-referral-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("referral_settings").select("*");
      return data || [];
    },
  });

  const updateSetting = async (key: string, value: number) => {
    await supabase
      .from("referral_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);
    refetchSettings();
  };

  const totalPending = rewards.filter((r: any) => r.status === "pending").reduce((sum: number, r: any) => sum + r.reward_amount, 0);
  const totalAvailable = rewards.filter((r: any) => r.status === "available").reduce((sum: number, r: any) => sum + r.reward_amount, 0);
  const totalWalletBalance = wallets.reduce((sum: number, w: any) => sum + (w.available_balance || 0), 0);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">Programa de Referidos</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Gift className="h-4 w-4" /> Rewards Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{rewards.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-warning">{totalPending.toFixed(2)} €</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{totalAvailable.toFixed(2)} €</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Saldo Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{totalWalletBalance.toFixed(2)} €</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
              <TabsTrigger value="wallets">Wallets</TabsTrigger>
              <TabsTrigger value="settings">Configuración</TabsTrigger>
            </TabsList>

            <TabsContent value="rewards" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards.map((reward: any) => (
                        <TableRow key={reward.id}>
                          <TableCell>{reward.orders?.order_number || "-"}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[reward.status]}>{reward.status}</Badge>
                          </TableCell>
                          <TableCell>{reward.product_subtotal?.toFixed(2)} €</TableCell>
                          <TableCell className="font-semibold">{reward.reward_amount?.toFixed(2)} €</TableCell>
                          <TableCell>{format(new Date(reward.created_at), "dd/MM/yy", { locale: es })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wallets" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Disponible</TableHead>
                        <TableHead>Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wallets.map((wallet: any) => (
                        <TableRow key={wallet.id}>
                          <TableCell>{wallet.profiles?.full_name || wallet.profiles?.email || "-"}</TableCell>
                          <TableCell className="font-semibold text-primary">{wallet.available_balance?.toFixed(2)} €</TableCell>
                          <TableCell className="text-warning">{wallet.pending_balance?.toFixed(2)} €</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" /> Configuración
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.map((setting: any) => (
                    <div key={setting.key} className="flex items-center justify-between gap-4 p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{setting.key}</p>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <Input
                        type="number"
                        className="w-24"
                        defaultValue={setting.value}
                        onBlur={(e) => updateSetting(setting.key, parseFloat(e.target.value))}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminReferrals;
