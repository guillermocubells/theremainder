import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ThumbsUp, MessageSquare, Flag, ShieldCheck, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import { useValidationAnalytics } from '@/hooks/useValidationAnalytics';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--secondary))',
];

export default function AdminValidationAnalytics() {
  const { t } = useTranslation();
  const [days, setDays] = useState(30);
  const { data, isLoading, error } = useValidationAnalytics(days);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-destructive">
        Error loading analytics: {(error as Error).message}
      </div>
    );
  }

  const summary = data!;
  const totalAll = summary.total_votes + summary.total_comments + summary.total_reports + summary.total_verifications;

  const pieData = [
    { name: 'Votos', value: summary.total_votes },
    { name: 'Comentarios', value: summary.total_comments },
    { name: 'Reportes', value: summary.total_reports },
    { name: 'Verificaciones', value: summary.total_verifications },
  ].filter((d) => d.value > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analíticas de Validación
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Interacciones de votos, comentarios, reportes y verificaciones
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 días</SelectItem>
            <SelectItem value="14">14 días</SelectItem>
            <SelectItem value="30">30 días</SelectItem>
            <SelectItem value="90">90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={ThumbsUp} label="Votos" value={summary.total_votes} color="text-primary" />
        <KPICard icon={MessageSquare} label="Comentarios" value={summary.total_comments} color="text-accent-foreground" />
        <KPICard icon={Flag} label="Reportes" value={summary.total_reports} color="text-destructive" />
        <KPICard icon={ShieldCheck} label="Verificaciones" value={summary.total_verifications} color="text-muted-foreground" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Actividad diaria</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.daily.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">Sin datos en este periodo</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={summary.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="votes" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} name="Votos" />
                  <Area type="monotone" dataKey="comments" stackId="1" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} name="Comentarios" />
                  <Area type="monotone" dataKey="reports" stackId="1" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.3} name="Reportes" />
                  <Area type="monotone" dataKey="verifications" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} name="Verificaciones" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución</CardTitle>
          </CardHeader>
          <CardContent>
            {totalAll === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-10">Sin datos</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desglose por acción</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.action_breakdown.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-10">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.action_breakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" allowDecimals={false} />
                <YAxis type="category" dataKey="action" tick={{ fontSize: 11 }} className="fill-muted-foreground" width={100} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${color}`} />
          <div>
            <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
