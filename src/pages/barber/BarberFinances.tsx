import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, TrendingUp, Calendar, BarChart3 } from 'lucide-react';

export default function BarberFinances() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, total: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchHistory();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [todayRes, weekRes, monthRes, totalRes] = await Promise.all([
      supabase.from('appointments').select('price').eq('barber_id', user.id).eq('appointment_date', today).eq('status', 'completed'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', weekStart).lte('appointment_date', weekEnd).eq('status', 'completed'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', monthStart).lte('appointment_date', monthEnd).eq('status', 'completed'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).eq('status', 'completed'),
    ]);

    const sum = (data: any[]) => data?.reduce((s, a) => s + Number(a.price), 0) ?? 0;
    setStats({
      today: sum(todayRes.data || []),
      week: sum(weekRes.data || []),
      month: sum(monthRes.data || []),
      total: sum(totalRes.data || []),
    });
  };

  const fetchHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name), profiles!appointments_client_id_fkey(full_name)')
      .eq('barber_id', user.id)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  };

  const cards = [
    { label: 'Hoje', value: stats.today, icon: DollarSign, gradient: 'from-success/20 to-success/5' },
    { label: 'Esta Semana', value: stats.week, icon: TrendingUp, gradient: 'from-primary/20 to-primary/5' },
    { label: 'Este Mês', value: stats.month, icon: Calendar, gradient: 'from-primary/20 to-primary/5' },
    { label: 'Total', value: stats.total, icon: BarChart3, gradient: 'from-primary/20 to-primary/5' },
  ];

  return (
    <BarberLayout>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <h1 className="text-3xl font-bold font-display">Financeiro</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div key={card.label} className={`glass-card p-5 bg-gradient-to-br ${card.gradient} animate-slide-up`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <card.icon className="w-5 h-5 text-success" />
              </div>
              <p className="text-2xl font-bold font-display">R$ {card.value.toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold font-display mb-4">Histórico de Atendimentos</h2>
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum atendimento concluído</p>
          ) : (
            <div className="space-y-3">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50">
                  <div>
                    <p className="font-medium">{h.profiles?.full_name || 'Cliente'}</p>
                    <p className="text-sm text-muted-foreground">{h.services?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(h.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </p>
                    <p className="font-semibold text-success">R$ {Number(h.price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </BarberLayout>
  );
}
