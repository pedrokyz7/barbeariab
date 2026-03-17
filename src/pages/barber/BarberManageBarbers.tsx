import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { UserPlus, Trash2, Phone, Mail, Eye, EyeOff, ChevronDown, ChevronUp, Scissors, DollarSign, Users, CalendarClock, Pencil, Check, X, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BarberInfo {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  is_available: boolean;
  avatar_url: string;
}

interface ClientDetail {
  client_id: string;
  name: string;
  appointments: number;
  revenue: number;
}

interface UpcomingAppointment {
  appointment_date: string;
  start_time: string;
  client_name: string;
  service_name: string;
  price: number;
}

interface BarberStats {
  totalClients: number;
  totalAppointments: number;
  totalRevenue: number;
  clients: ClientDetail[];
  upcoming: UpcomingAppointment[];
}

export default function BarberManageBarbers() {
  const { user, role } = useAuth();
  const [barbers, setBarbers] = useState<BarberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);
  const [statsCache, setStatsCache] = useState<Record<string, BarberStats>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);
  const [editingBarber, setEditingBarber] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (user) fetchBarbers();
  }, [user]);

  const fetchBarbers = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-barbers', {
        body: { action: 'list' },
      });
      if (error) {
        toast.error('Erro ao carregar barbeiros');
        return;
      }
      setBarbers(data?.barbers || []);
    } catch {
      toast.error('Erro ao carregar barbeiros');
    }
  };

  const fetchStats = async (barberId: string) => {
    if (statsCache[barberId]) return;
    setLoadingStats(barberId);
    try {
      const { data, error } = await supabase.functions.invoke('manage-barbers', {
        body: { action: 'stats', barber_user_id: barberId },
      });
      if (!error && data) {
        setStatsCache((prev) => ({ ...prev, [barberId]: data }));
      }
    } catch {
      toast.error('Erro ao carregar estatísticas');
    }
    setLoadingStats(null);
  };

  const toggleExpand = (barberId: string) => {
    if (expandedBarber === barberId) {
      setExpandedBarber(null);
    } else {
      setExpandedBarber(barberId);
      fetchStats(barberId);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) {
      toast.error('Preencha nome, email e senha');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('manage-barbers', {
      body: { action: 'create', ...form },
    });
    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao criar barbeiro');
      return;
    }
    toast.success('Barbeiro adicionado com sucesso!');
    setForm({ full_name: '', email: '', password: '', phone: '' });
    setShowForm(false);
    fetchBarbers();
  };
  const handleRename = async (barberId: string) => {
    if (!editName.trim()) { toast.error('Nome não pode ser vazio'); return; }
    const { data, error } = await supabase.functions.invoke('manage-barbers', {
      body: { action: 'rename', barber_user_id: barberId, full_name: editName.trim() },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao renomear');
      return;
    }
    toast.success('Nome atualizado!');
    setEditingBarber(null);
    fetchBarbers();
  };

  const handleToggleAvailability = async (barberId: string, newValue: boolean) => {
    const { data, error } = await supabase.functions.invoke('manage-barbers', {
      body: { action: 'toggle_availability', barber_user_id: barberId, is_available: newValue },
    });
    if (error || data?.error) {
      toast.error('Erro ao alterar disponibilidade');
      return;
    }
    toast.success(newValue ? 'Barbeiro disponível' : 'Barbeiro indisponível');
    setBarbers(prev => prev.map(b => b.user_id === barberId ? { ...b, is_available: newValue } : b));
  };

  const handleDelete = async (barberUserId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover ${name}?`)) return;
    const { data, error } = await supabase.functions.invoke('manage-barbers', {
      body: { action: 'delete', barber_user_id: barberUserId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao remover barbeiro');
      return;
    }
    toast.success('Barbeiro removido');
    fetchBarbers();
  };

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <BarberLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in overflow-x-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Barbeiros</h1>
            <p className="text-muted-foreground mt-1">{barbers.length} barbeiro{barbers.length !== 1 ? 's' : ''}</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
            variant={showForm ? 'secondary' : 'default'}
          >
            <UserPlus className="w-4 h-4" />
            {showForm ? 'Cancelar' : 'Adicionar'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="glass-card p-6 space-y-4 animate-slide-up">
            <h2 className="text-lg font-semibold font-display">Novo Barbeiro</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome completo *</label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nome do barbeiro" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email *</label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="barbeiro@email.com" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Senha *</label>
                <div className="relative">
                  <Input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Senha de acesso" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Criando...' : 'Criar Barbeiro'}
            </Button>
          </form>
        )}

        {barbers.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 glass-card">Nenhum barbeiro cadastrado</p>
        ) : (
          <div className="space-y-3">
            {barbers.map((b) => {
              const isExpanded = expandedBarber === b.user_id;
              const stats = statsCache[b.user_id];
              const isLoading = loadingStats === b.user_id;

              return (
                <div key={b.user_id} className="glass-card animate-slide-up overflow-hidden">
                  <div
                    className="p-3 sm:p-4 cursor-pointer hover:bg-accent/10 transition-colors"
                    onClick={() => toggleExpand(b.user_id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        {editingBarber === b.user_id ? (
                          <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm flex-1 min-w-[120px] max-w-[200px]"
                              autoFocus
                              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(b.user_id); if (e.key === 'Escape') setEditingBarber(null); }}
                            />
                            <button onClick={() => handleRename(b.user_id)} className="p-1 rounded hover:bg-primary/20 text-primary"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingBarber(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <p className="font-medium flex items-center gap-2 text-sm sm:text-base">
                            <span className="truncate">{b.full_name || 'Barbeiro'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{b.email}</span>
                        </p>
                        {b.phone && (
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" /> {formatPhone(b.phone)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleAvailability(b.user_id, !b.is_available);
                          }}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-accent/20 transition-colors"
                          title={b.is_available ? 'Disponível – clique para desativar' : 'Indisponível – clique para ativar'}
                        >
                          <Circle className={`w-4 h-4 ${b.is_available ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingBarber(b.user_id); setEditName(b.full_name); }}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar nome"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {role === 'admin' && b.user_id !== user?.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(b.user_id, b.full_name); }}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                            title="Remover barbeiro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/50 p-4 space-y-4 animate-fade-in">
                      {isLoading ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Carregando estatísticas...</p>
                      ) : stats ? (
                        <>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-accent/10 rounded-xl p-3 text-center">
                              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <p className="text-2xl font-bold">{stats.totalClients}</p>
                              <p className="text-xs text-muted-foreground">Clientes</p>
                            </div>
                            <div className="bg-accent/10 rounded-xl p-3 text-center">
                              <Scissors className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <p className="text-2xl font-bold">{stats.totalAppointments}</p>
                              <p className="text-xs text-muted-foreground">Atendimentos</p>
                            </div>
                            <div className="bg-accent/10 rounded-xl p-3 text-center">
                              <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                              <p className="text-xs text-muted-foreground">Faturamento</p>
                            </div>
                          </div>

                          {stats.clients.length > 0 ? (
                            <div>
                              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Detalhes por cliente</h3>
                              <div className="space-y-2">
                                {stats.clients.map((c) => (
                                  <div key={c.client_id} className="flex items-center justify-between bg-accent/5 rounded-lg px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium">{c.name}</p>
                                      <p className="text-xs text-muted-foreground">{c.appointments} atendimento{c.appointments !== 1 ? 's' : ''}</p>
                                    </div>
                                    <p className="text-sm font-semibold text-primary">{formatCurrency(c.revenue)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center">Nenhum atendimento registrado</p>
                          )}

                          {stats.upcoming && stats.upcoming.length > 0 && (
                            <div>
                              <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-1">
                                <CalendarClock className="w-4 h-4" /> Próximos agendamentos
                              </h3>
                              <div className="space-y-2">
                                {stats.upcoming.map((u, i) => (
                                  <div key={i} className="flex items-center justify-between bg-primary/5 rounded-lg px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium">{u.client_name}</p>
                                      <p className="text-xs text-muted-foreground">{u.service_name}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold">{new Date(u.appointment_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                                      <p className="text-xs text-muted-foreground">{u.start_time.slice(0, 5)} • {formatCurrency(u.price)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BarberLayout>
  );
}
