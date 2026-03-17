import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { Calendar, DollarSign, Users, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  today: number;
  week: number;
  month: number;
  todayCount: number;
  prevDay: number;
  prevWeek: number;
  prevMonth: number;
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

function calcPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

function PercentBadge({ current, previous }: { current: number; previous: number }) {
  const pct = calcPercent(current, previous);
  if (pct === null) return <span className="text-xs text-muted-foreground">—</span>;
  const isUp = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-success' : 'text-destructive'}`}>
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function BarberDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, todayCount: 0, prevDay: 0, prevWeek: 0, prevMonth: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetchUpcoming();
  }, [user]);

  const getDateRanges = () => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const yesterday = format(subDays(now, 1), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const prevWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const prevWeekEnd = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
    const prevMonthStart = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
    const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
    return { today, yesterday, weekStart, weekEnd, prevWeekStart, prevWeekEnd, monthStart, monthEnd, prevMonthStart, prevMonthEnd };
  };

  const sumPrices = (data: any[] | null) => data?.reduce((s, a) => s + Number(a.price), 0) ?? 0;

  const fetchStats = async () => {
    if (!user) return;
    const d = getDateRanges();

    const [todayRes, weekRes, monthRes, prevDayRes, prevWeekRes, prevMonthRes] = await Promise.all([
      supabase.from('appointments').select('price').eq('barber_id', user.id).eq('appointment_date', d.today).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', d.weekStart).lte('appointment_date', d.weekEnd).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', d.monthStart).lte('appointment_date', d.monthEnd).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).eq('appointment_date', d.yesterday).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', d.prevWeekStart).lte('appointment_date', d.prevWeekEnd).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price').eq('barber_id', user.id).gte('appointment_date', d.prevMonthStart).lte('appointment_date', d.prevMonthEnd).eq('payment_status', 'paid'),
    ]);

    const todayCount = await supabase.from('appointments').select('id', { count: 'exact', head: true })
      .eq('barber_id', user.id).eq('appointment_date', d.today).eq('status', 'scheduled');

    setStats({
      today: sumPrices(todayRes.data),
      week: sumPrices(weekRes.data),
      month: sumPrices(monthRes.data),
      todayCount: todayCount.count ?? 0,
      prevDay: sumPrices(prevDayRes.data),
      prevWeek: sumPrices(prevWeekRes.data),
      prevMonth: sumPrices(prevMonthRes.data),
    });
  };

  const fetchBarberEarnings = async () => {
    if (!user) return;
    // Get barbers under this admin
    const { data: barbers } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('admin_id', user.id);

    // Include self
    const { data: selfProfile } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .eq('user_id', user.id)
      .single();

    const allBarbers = [
      ...(selfProfile ? [{ user_id: selfProfile.user_id, full_name: selfProfile.full_name }] : []),
      ...(barbers || []).filter(b => b.user_id !== user.id),
    ];

    if (allBarbers.length === 0) return;

    const d = getDateRanges();
    const barberIds = allBarbers.map(b => b.user_id);

    // Fetch all appointments for these barbers in relevant periods
    const [todayRes, weekRes, monthRes, prevDayRes, prevWeekRes, prevMonthRes] = await Promise.all([
      supabase.from('appointments').select('price, barber_id').in('barber_id', barberIds).eq('appointment_date', d.today).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price, barber_id').in('barber_id', barberIds).gte('appointment_date', d.weekStart).lte('appointment_date', d.weekEnd).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price, barber_id').in('barber_id', barberIds).gte('appointment_date', d.monthStart).lte('appointment_date', d.monthEnd).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price, barber_id').in('barber_id', barberIds).eq('appointment_date', d.yesterday).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price, barber_id').in('barber_id', barberIds).gte('appointment_date', d.prevWeekStart).lte('appointment_date', d.prevWeekEnd).eq('payment_status', 'paid'),
      supabase.from('appointments').select('price, barber_id').in('barber_id', barberIds).gte('appointment_date', d.prevMonthStart).lte('appointment_date', d.prevMonthEnd).eq('payment_status', 'paid'),
    ]);

    const sumByBarber = (data: any[] | null, barberId: string) =>
      data?.filter(a => a.barber_id === barberId).reduce((s, a) => s + Number(a.price), 0) ?? 0;

    const earnings: BarberEarnings[] = allBarbers.map(b => ({
      barber_id: b.user_id,
      barber_name: b.full_name || 'Barbeiro',
      today: sumByBarber(todayRes.data, b.user_id),
      week: sumByBarber(weekRes.data, b.user_id),
      month: sumByBarber(monthRes.data, b.user_id),
      prevDay: sumByBarber(prevDayRes.data, b.user_id),
      prevWeek: sumByBarber(prevWeekRes.data, b.user_id),
      prevMonth: sumByBarber(prevMonthRes.data, b.user_id),
    }));

    setBarberEarnings(earnings);
    setConsolidatedMonth(earnings.reduce((s, e) => s + e.month, 0));
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
    { label: 'Hoje', value: stats.today, prev: stats.prevDay, icon: DollarSign, color: 'text-success' },
    { label: 'Semana', value: stats.week, prev: stats.prevWeek, icon: TrendingUp, color: 'text-primary' },
    { label: 'Mês', value: stats.month, prev: stats.prevMonth, icon: Calendar, color: 'text-primary' },
    { label: 'Agendamentos Hoje', value: stats.todayCount, icon: Users, color: 'text-primary', isCurrency: false },
  ];

  return (
    <BarberLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in min-w-0">
        <div>
          <h1 className="text-3xl font-bold font-display animate-[pulse_3s_ease-in-out_infinite] bg-gradient-to-r from-primary via-destructive to-primary bg-clip-text text-transparent">Painel Financeiro</h1>
          <p className="text-muted-foreground mt-1">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Stats Cards */}
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
              {'prev' in card && card.prev !== undefined && (
                <div className="mt-1">
                  <PercentBadge current={Number(card.value)} previous={card.prev} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Consolidated Monthly Total */}
        {barberEarnings.length > 0 && (
          <div className="glass-card p-6 bg-gradient-to-br from-success/10 to-success/5 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold font-display">Ganho Total do Mês</h2>
              <BarChart3 className="w-6 h-6 text-success" />
            </div>
            <p className="text-3xl font-bold font-display text-success">
              R$ {consolidatedMonth.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Consolidado de {barberEarnings.length} barbeiro{barberEarnings.length > 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Per-barber Earnings */}
        {barberEarnings.length > 0 && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-semibold font-display mb-4">Ganhos por Barbeiro</h2>
            <div className="space-y-4">
              {barberEarnings.map((b) => (
                <div key={b.barber_id} className="p-4 rounded-xl bg-secondary/50 animate-slide-up">
                  <p className="font-semibold mb-3">{b.barber_name}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Hoje</p>
                      <p className="text-sm font-bold">R$ {b.today.toFixed(2)}</p>
                      <PercentBadge current={b.today} previous={b.prevDay} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Semana</p>
                      <p className="text-sm font-bold">R$ {b.week.toFixed(2)}</p>
                      <PercentBadge current={b.week} previous={b.prevWeek} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Mês</p>
                      <p className="text-sm font-bold">R$ {b.month.toFixed(2)}</p>
                      <PercentBadge current={b.month} previous={b.prevMonth} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
