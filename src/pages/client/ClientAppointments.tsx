import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClientLayout } from '@/components/client/ClientLayout';
import { Calendar, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number;
  barber_name: string;
  service_name: string;
}

export default function ClientAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    if (user) fetchAppointments();
  }, [user, filter]);

  const fetchAppointments = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    let query = supabase
      .from('appointments')
      .select('*, services(name), profiles!appointments_barber_id_fkey(full_name)')
      .eq('client_id', user.id);

    if (filter === 'upcoming') {
      query = query.gte('appointment_date', today).order('appointment_date').order('start_time');
    } else {
      query = query.lt('appointment_date', today).order('appointment_date', { ascending: false });
    }

    const { data } = await query.limit(50);
    if (data) {
      setAppointments(data.map((a: any) => ({
        id: a.id,
        appointment_date: a.appointment_date,
        start_time: a.start_time,
        end_time: a.end_time,
        status: a.status,
        price: a.price,
        barber_name: a.profiles?.full_name || 'Barbeiro',
        service_name: a.services?.name || 'Serviço',
      })));
    }
  };

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast.error('Erro ao cancelar'); return; }
    toast.success('Agendamento cancelado');
    fetchAppointments();
  };

  const statusLabel: Record<string, string> = {
    scheduled: 'Agendado',
    completed: 'Concluído',
    cancelled: 'Cancelado',
  };

  const statusColor: Record<string, string> = {
    scheduled: 'text-primary',
    completed: 'text-success',
    cancelled: 'text-destructive',
  };

  return (
    <ClientLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold font-display">Meus Agendamentos</h1>

        <div className="flex gap-2">
          <Button
            variant={filter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            className="rounded-xl"
            onClick={() => setFilter('upcoming')}
          >
            Próximos
          </Button>
          <Button
            variant={filter === 'past' ? 'default' : 'outline'}
            size="sm"
            className="rounded-xl"
            onClick={() => setFilter('past')}
          >
            Histórico
          </Button>
        </div>

        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 glass-card">
            Nenhum agendamento {filter === 'upcoming' ? 'próximo' : 'no histórico'}
          </p>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div key={apt.id} className="glass-card p-4 flex items-center justify-between animate-slide-up">
                <div className="space-y-1">
                  <p className="font-medium">{apt.service_name}</p>
                  <p className="text-sm text-muted-foreground">com {apt.barber_name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {apt.start_time.slice(0, 5)}
                    </span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <p className="font-bold text-success">R$ {Number(apt.price).toFixed(2)}</p>
                  <p className={`text-xs font-medium ${statusColor[apt.status] || ''}`}>
                    {statusLabel[apt.status] || apt.status}
                  </p>
                  {apt.status === 'scheduled' && filter === 'upcoming' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive text-xs h-7"
                      onClick={() => cancelAppointment(apt.id)}
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
