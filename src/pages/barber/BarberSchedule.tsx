import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number;
  client_name: string;
  service_name: string;
}

export default function BarberSchedule() {
  const { user } = useAuth();
  const [weekOffset, setWeekOffset] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDay, setSelectedDay] = useState(new Date());

  const weekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (user) fetchAppointments();
  }, [user, weekOffset]);

  const fetchAppointments = async () => {
    if (!user) return;
    const start = format(days[0], 'yyyy-MM-dd');
    const end = format(days[6], 'yyyy-MM-dd');
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, appointment_date, start_time, end_time, status, price, client_id, service_id')
      .eq('barber_id', user.id)
      .gte('appointment_date', start)
      .lte('appointment_date', end)
      .order('start_time');

    if (!appts || appts.length === 0) { setAppointments([]); return; }

    const clientIds = [...new Set(appts.map(a => a.client_id))];
    const serviceIds = [...new Set(appts.map(a => a.service_id))];

    const [{ data: profiles }, { data: services }] = await Promise.all([
      supabase.from('profiles').select('user_id, full_name').in('user_id', clientIds),
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
      client_name: profileMap[a.client_id] || 'Cliente',
      service_name: serviceMap[a.service_id] || 'Serviço',
    })));
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', id);
    toast.success(status === 'completed' ? 'Concluído!' : 'Cancelado!');
    fetchAppointments();
  };

  const dayAppointments = appointments.filter(
    a => a.appointment_date === format(selectedDay, 'yyyy-MM-dd')
  );

  const statusColors: Record<string, string> = {
    scheduled: 'bg-primary/20 text-primary',
    completed: 'bg-success/20 text-success',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  return (
    <BarberLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold font-display">Agenda</h1>

        {/* Week navigator */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)} className="rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((day) => {
              const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDay, 'yyyy-MM-dd');
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dayAptsCount = appointments.filter(a => a.appointment_date === format(day, 'yyyy-MM-dd')).length;
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`flex flex-col items-center px-4 py-3 rounded-2xl min-w-[72px] transition-all animate-press ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'
                  }`}
                >
                  <span className="text-xs uppercase opacity-70">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <span className="text-lg font-bold font-display">{format(day, 'd')}</span>
                  {dayAptsCount > 0 && (
                    <span className={`text-xs mt-1 ${isSelected ? 'opacity-80' : 'text-muted-foreground'}`}>
                      {dayAptsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)} className="rounded-xl">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Day appointments */}
        <div className="space-y-3">
          <h2 className="font-semibold font-display text-lg">
            {format(selectedDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h2>
          {dayAppointments.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum agendamento neste dia</p>
            </div>
          ) : (
            dayAppointments.map((apt) => (
              <div key={apt.id} className="glass-card p-4 flex items-center justify-between animate-slide-up">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-bold font-display">{apt.start_time.slice(0, 5)}</p>
                    <p className="text-xs text-muted-foreground">{apt.end_time.slice(0, 5)}</p>
                  </div>
                  <div>
                    <p className="font-medium">{apt.client_name}</p>
                    <p className="text-sm text-muted-foreground">{apt.service_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                    {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'completed' ? 'Concluído' : 'Cancelado'}
                  </span>
                  {apt.status === 'scheduled' && (
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
            ))
          )}
        </div>
      </div>
    </BarberLayout>
  );
}
