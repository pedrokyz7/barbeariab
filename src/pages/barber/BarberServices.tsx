import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
}

export default function BarberServices() {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', duration_minutes: 30, price: 0 });

  useEffect(() => {
    if (user) fetchServices();
  }, [user]);

  const fetchServices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('barber_id', user.id)
      .order('name');
    if (data) setServices(data);
  };

  const handleSave = async () => {
    if (!user || !form.name) return;
    try {
      if (editingId) {
        await supabase.from('services').update({
          name: form.name,
          duration_minutes: form.duration_minutes,
          price: form.price,
        }).eq('id', editingId);
        toast.success('Serviço atualizado!');
      } else {
        await supabase.from('services').insert({
          barber_id: user.id,
          name: form.name,
          duration_minutes: form.duration_minutes,
          price: form.price,
        });
        toast.success('Serviço criado!');
      }
      resetForm();
      fetchServices();
    } catch {
      toast.error('Erro ao salvar serviço');
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('services').delete().eq('id', id);
    toast.success('Serviço removido!');
    fetchServices();
  };

  const startEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: Number(s.price) });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: '', duration_minutes: 30, price: 0 });
  };

  return (
    <BarberLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold font-display">Serviços</h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl animate-press">
            <Plus className="w-4 h-4 mr-2" /> Novo Serviço
          </Button>
        </div>

        {showForm && (
          <div className="glass-card p-6 space-y-4 animate-slide-up">
            <h3 className="font-semibold font-display">{editingId ? 'Editar' : 'Novo'} Serviço</h3>
            <Input
              placeholder="Nome do serviço"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-secondary border-border rounded-xl h-11"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Duração (min)</label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                  className="bg-secondary border-border rounded-xl h-11"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Preço (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                  className="bg-secondary border-border rounded-xl h-11"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} className="rounded-xl animate-press">
                <Check className="w-4 h-4 mr-2" /> Salvar
              </Button>
              <Button variant="outline" onClick={resetForm} className="rounded-xl animate-press">
                <X className="w-4 h-4 mr-2" /> Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {services.length === 0 && (
            <p className="text-center text-muted-foreground py-12">Nenhum serviço cadastrado</p>
          )}
          {services.map((s) => (
            <div key={s.id} className="glass-card p-4 flex items-center justify-between animate-slide-up">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted-foreground">{s.duration_minutes} min</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold font-display text-success">R$ {Number(s.price).toFixed(2)}</span>
                <button onClick={() => startEdit(s)} className="p-2 hover:bg-accent rounded-lg transition-colors">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => handleDelete(s.id)} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BarberLayout>
  );
}
