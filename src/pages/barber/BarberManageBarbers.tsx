import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { UserPlus, Trash2, Phone, Mail, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BarberInfo {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
}

export default function BarberManageBarbers() {
  const { user } = useAuth();
  const [barbers, setBarbers] = useState<BarberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) fetchBarbers();
  }, [user]);

  const fetchBarbers = async () => {
    const { data, error } = await supabase.functions.invoke('manage-barbers', {
      body: { action: 'list' },
    });
    if (error) {
      toast.error('Erro ao carregar barbeiros');
      return;
    }
    setBarbers(data.barbers || []);
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

  return (
    <BarberLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
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
                <Input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Nome do barbeiro"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Telefone</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="barbeiro@email.com"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Senha *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Senha de acesso"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
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
            {barbers.map((b) => (
              <div key={b.user_id} className="glass-card p-4 flex items-center justify-between animate-slide-up">
                <div className="space-y-1">
                  <p className="font-medium">{b.full_name || 'Barbeiro'}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {b.email}
                  </p>
                  {b.phone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {formatPhone(b.phone)}
                    </p>
                  )}
                </div>
                {b.user_id !== user?.id && (
                  <button
                    onClick={() => handleDelete(b.user_id, b.full_name)}
                    className="p-2 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                    title="Remover barbeiro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BarberLayout>
  );
}
