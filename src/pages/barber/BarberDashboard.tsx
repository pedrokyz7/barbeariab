import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  today: number;
  week: number;
  month: number;
  todayCount: number;
}

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number;
  client_name: string;
  service_name: string;
}

export default function BarberDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, todayCount: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchUpcoming();
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const [todayRes, weekRes, monthRes] = await Promise.all([
      supabase.from('appointments').select('price').eq('barber_id', user.id).eq('appointment_date', today).eq('status', 'completed'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', weekStart).lte('appointment_date', weekEnd).eq('status', 'completed'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', monthStart).lte('appointment_date', monthEnd).eq('status', 'completed'),
    ]);

    const todayCount = await supabase.from('appointments').select('id', { count: 'exact', head: true })
      .eq('barber_id', user.id).eq('appointment_date', today).eq('status', 'scheduled');

    setStats({
      today: todayRes.data?.reduce((sum, a) => sum + Number(a.price), 0) ?? 0,
      week: weekRes.data?.reduce((sum, a) => sum + Number(a.price), 0) ?? 0,
      month: monthRes.data?.reduce((sum, a) => sum + Number(a.price), 0) ?? 0,
      todayCount: todayCount.count ?? 0,
    });
  };

  const fetchUpcoming = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('appointments')
      .select('*, services(name), profiles!appointments_client_id_fkey(full_name)')
      .eq('barber_id', user.id)
      .gte('appointment_date', today)
      .eq('status', 'scheduled')
      .order('appointment_date')
      .order('start_time')
      .limit(10);

    if (data) {
      setUpcoming(data.map((a: any) => ({
        id: a.id,
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        price: a.price,
        client_name: a.profiles?.full_name || 'Cliente',
        service_name: a.services?.name || 'Serviço',
      })));
    }
  };

  const statCards = [
    { label: 'Hoje', value: stats.today, icon: DollarSign, color: 'text-success' },
    { label: 'Semana', value: stats.week, icon: TrendingUp, color: 'text-primary' },
    { label: 'Mês', value: stats.month, icon: Calendar, color: 'text-primary' },
    { label: 'Agendamentos Hoje', value: stats.todayCount, icon: Users, color: 'text-primary', isCurrency: false },
  ];

  return (
    <BarberLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display animate-[pulse_3s_ease-in-out_infinite] bg-gradient-to-r from-primary via-destructive to-primary bg-clip-text text-transparent">Painel Financeiro</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="glass-card p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold font-display">
                {card.isCurrency === false ? card.value : `R$ ${Number(card.value).toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold font-display mb-4">Próximos Agendamentos</h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum agendamento próximo</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 animate-slide-up">
                  <div>
                    <p className="font-medium">{apt.client_name}</p>
                    <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM')} • {apt.start_time.slice(0, 5)}
                    </p>
                    <p className="text-sm text-success font-semibold">R$ {Number(apt.price).toFixed(2)}</p>
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
