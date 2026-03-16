import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClientLayout } from '@/components/client/ClientLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Scissors, ArrowLeft, ArrowRight, Clock, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Barber {
  user_id: string;
  full_name: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

type Step = 'barber' | 'service' | 'datetime' | 'confirm';

export default function ClientBooking() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('barber');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (selectedBarber) fetchServices();
  }, [selectedBarber]);

  useEffect(() => {
    if (selectedBarber && selectedServices.length > 0 && selectedDate) fetchSlots();
    else setSlots([]);
  }, [selectedBarber, selectedServices, selectedDate]);

  const fetchBarbers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').in('role', ['barber', 'admin']);
    if (!roles?.length) return;
    const ids = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids);
    if (profiles) setBarbers(profiles);
  };

  const fetchServices = async () => {
    if (!selectedBarber) return;
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('barber_id', selectedBarber.user_id)
      .eq('is_active', true)
      .order('name');
    if (data) setServices(data);
  };

  const fetchSlots = async () => {
    if (!selectedBarber || selectedServices.length === 0) return;
    const dayOfWeek = selectedDate.getDay();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data: schedule } = await supabase
      .from('barber_schedules')
      .select('*')
      .eq('barber_id', selectedBarber.user_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single();

    if (!schedule) {
      setSlots([]);
      return;
    }

    const { data: existingApts } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('barber_id', selectedBarber.user_id)
      .eq('appointment_date', dateStr)
      .neq('status', 'cancelled');

    const available: string[] = [];
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);
    const duration = totalDuration;

    for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
      const hasConflict = existingApts?.some(apt => {
        const aptStart = timeToMinutes(apt.start_time);
        const aptEnd = timeToMinutes(apt.end_time);
        return m < aptEnd && m + duration > aptStart;
      });

      if (!hasConflict) {
        if (dateStr === format(new Date(), 'yyyy-MM-dd')) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          if (m <= nowMinutes) continue;
        }
        available.push(minutesToTime(m));
      }
    }

    setSlots(available);
  };

  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (minutes: number) => {
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = (minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const handleBook = async () => {
    if (!user || !selectedBarber || selectedServices.length === 0 || !selectedTime) return;
    setIsBooking(true);
    try {
      const endMinutes = timeToMinutes(selectedTime) + totalDuration;
      const endTime = minutesToTime(endMinutes);

      // Insert one appointment per selected service, chained in time
      let currentStart = selectedTime;
      for (const svc of selectedServices) {
        const svcEnd = minutesToTime(timeToMinutes(currentStart) + svc.duration_minutes);
        const { error } = await supabase.from('appointments').insert({
          client_id: user.id,
          barber_id: selectedBarber.user_id,
          service_id: svc.id,
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: currentStart,
          end_time: svcEnd,
          price: svc.price,
        });
        if (error) throw error;
        currentStart = svcEnd;
      }

      toast.success('Agendamento realizado com sucesso!');
      setStep('barber');
      setSelectedBarber(null);
      setSelectedServices([]);
      setSelectedTime(null);
    } catch (error: any) {
      toast.error('Erro ao agendar: ' + error.message);
    } finally {
      setIsBooking(false);
    }
  };

  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  return (
    <ClientLayout>
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        {/* Progress */}
        <div className="flex items-center gap-2 justify-center">
          {['barber', 'service', 'datetime', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s ? 'bg-primary text-primary-foreground' :
                ['barber', 'service', 'datetime', 'confirm'].indexOf(step) > i ? 'bg-success text-success-foreground' :
                'bg-secondary text-muted-foreground'
              }`}>
                {['barber', 'service', 'datetime', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
              </div>
              {i < 3 && <div className={`w-8 h-0.5 ${['barber', 'service', 'datetime', 'confirm'].indexOf(step) > i ? 'bg-success' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        {/* Step: Select Barber */}
        {step === 'barber' && (
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-2xl font-bold font-display text-center">Escolha o Barbeiro</h2>
            <p className="text-center text-sm text-muted-foreground">
              {barbers.length === 0 ? '0 barbeiros disponíveis' : `${barbers.length} barbeiro${barbers.length > 1 ? 's' : ''} disponíve${barbers.length > 1 ? 'is' : 'l'}`}
            </p>
            {barbers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum barbeiro cadastrado no momento</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {barbers.map((b) => (
                  <button
                    key={b.user_id}
                    onClick={() => { setSelectedBarber(b); setStep('service'); }}
                    className="glass-card p-6 text-center hover:border-primary transition-all animate-press"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Scissors className="w-7 h-7 text-primary" />
                    </div>
                    <p className="font-medium">{b.full_name || 'Barbeiro'}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Select Services (multi) */}
        {step === 'service' && (
          <div className="space-y-4 animate-slide-up">
            <button onClick={() => setStep('barber')} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>
            <h2 className="text-2xl font-bold font-display text-center">Escolha os Serviços</h2>
            <p className="text-center text-sm text-muted-foreground">Selecione um ou mais serviços</p>
            <div className="space-y-3">
              {services.map((s) => {
                const isSelected = selectedServices.some(ss => ss.id === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleService(s)}
                    className={`glass-card p-4 w-full text-left flex items-center justify-between transition-all animate-press ${
                      isSelected ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold font-display text-success">R$ {Number(s.price).toFixed(2)}</span>
                  </button>
                );
              })}
            </div>

            {selectedServices.length > 0 && (
              <div className="space-y-3">
                <div className="glass-card p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''} • {totalDuration} min</span>
                  <span className="font-bold text-success">R$ {totalPrice.toFixed(2)}</span>
                </div>
                <Button
                  onClick={() => setStep('datetime')}
                  className="w-full h-12 rounded-xl text-base font-semibold animate-press"
                >
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step: Select Date & Time */}
        {step === 'datetime' && (
          <div className="space-y-4 animate-slide-up">
            <button onClick={() => setStep('service')} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>
            <h2 className="text-2xl font-bold font-display text-center">Escolha a Data e Hora</h2>

            <div className="grid grid-cols-7 gap-1">
              {nextDays.map((day) => {
                const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                    className={`flex flex-col items-center py-1.5 rounded-xl transition-all animate-press ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="text-[10px] uppercase opacity-70">{format(day, 'EEE', { locale: ptBR }).slice(0, 3)}</span>
                    <span className="text-sm font-bold font-display">{format(day, 'd')}</span>
                  </button>
                );
              })}
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Horários disponíveis</p>
              {slots.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 glass-card">Nenhum horário disponível neste dia</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-3 rounded-xl text-sm font-medium transition-all animate-press ${
                        selectedTime === time
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card border border-border hover:border-primary/50'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedTime && (
              <Button
                onClick={() => setStep('confirm')}
                className="w-full h-12 rounded-xl text-base font-semibold animate-press"
              >
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && selectedBarber && selectedServices.length > 0 && selectedTime && (
          <div className="space-y-6 animate-slide-up">
            <button onClick={() => setStep('datetime')} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </button>
            <h2 className="text-2xl font-bold font-display text-center">Confirmar Agendamento</h2>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Scissors className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Barbeiro</p>
                  <p className="font-medium">{selectedBarber.full_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Serviços</p>
                  {selectedServices.map(s => (
                    <p key={s.id} className="font-medium">
                      {s.name} <span className="text-muted-foreground text-sm">({s.duration_minutes} min - R$ {Number(s.price).toFixed(2)})</span>
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Data e Hora</p>
                  <p className="font-medium">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {selectedTime}
                  </p>
                  <p className="text-sm text-muted-foreground">Duração total: {totalDuration} min</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-success" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-bold font-display text-lg text-success">R$ {totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleBook}
              disabled={isBooking}
              className="w-full h-12 rounded-xl text-base font-semibold animate-press"
            >
              {isBooking ? 'Agendando...' : 'Confirmar Agendamento'}
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
