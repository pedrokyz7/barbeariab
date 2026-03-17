import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, CalendarDays, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number;
  payment_status: string;
  client_name: string;
  client_phone: string | null;
  service_name: string;
}

export default function BarberSchedule() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: appts } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, end_time, status, price, payment_status, client_id, service_id')
      .eq('barber_id', user.id)
      .gte('appointment_date', today)
      .neq('status', 'cancelled')
      .order('appointment_date')
      .order('start_time');

    if (!appts || appts.length === 0) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    const clientIds = [...new Set(appts.map(a => a.client_id))];
    const serviceIds = [...new Set(appts.map(a => a.service_id))];

    const [{ data: profiles }, { data: services }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name, phone').in('user_id', clientIds),
      supabase.from('services').select('id, name').in('id', serviceIds),
    ]);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
    const serviceMap = Object.fromEntries((services || []).map(s => [s.id, s.name]));

    setAppointments(appts.map(a => ({
      id: a.id,
      appointment_date: a.appointment_date,
      start_time: a.start_time,
      end_time: a.end_time,
      status: a.status,
      price: a.price,
      payment_status: a.payment_status,
      client_name: profileMap[a.client_id] || 'Cliente',
      service_name: serviceMap[a.service_id] || 'Serviço',
    })));
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    toast.success(status === 'completed' ? 'Concluído!' : 'Cancelado!');
    fetchAppointments();
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-primary/20 text-primary',
    arrived: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-success/20 text-success',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  const grouped = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    if (!acc[apt.appointment_date]) acc[apt.appointment_date] = [];
    acc[apt.appointment_date].push(apt);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort();

  return (
    <BarberLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold font-display">Clientes Agendados</h1>
        <p className="text-muted-foreground text-sm">Todos os agendamentos feitos pelos clientes aparecem aqui automaticamente.</p>

        {loading ? (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Nenhum agendamento próximo</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <h2 className="font-semibold font-display text-lg capitalize">
                  {format(new Date(date + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
                <span className="text-xs text-muted-foreground">({grouped[date].length})</span>
              </div>
              {grouped[date].map((apt) => (
                <div key={apt.id} className="glass-card p-4 flex items-center justify-between animate-slide-up">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[50px]">
                      <p className="font-bold font-display">{apt.start_time.slice(0, 5)}</p>
                      <p className="text-xs text-muted-foreground">{apt.end_time.slice(0, 5)}</p>
                    </div>
                    <div>
                      <p className="font-medium">{apt.client_name}</p>
                      <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                      {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'arrived' ? 'Chegou' : apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                    </span>
                    {(apt.status === 'scheduled' || apt.status === 'arrived') && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus(apt.id, 'completed')} className="p-1.5 hover:bg-success/10 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </button>
                        <button onClick={() => updateStatus(apt.id, 'cancelled')} className="p-1.5 hover:bg-destructive/10 rounded-lg">
                          <XCircle className="w-5 h-5 text-destructive" />
                        </button>
                      </div>
                    )}
                    <span className="font-semibold font-display">R$ {Number(apt.price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </BarberLayout>
  );
}