import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClientLayout } from '@/components/client/ClientLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Phone, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function ClientProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('full_name, phone').eq('user_id', user.id).single();
    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone ? formatPhone(data.phone) : '');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      phone: phone.replace(/\D/g, ''),
    }).eq('user_id', user.id);

    if (error) toast.error('Erro ao salvar perfil');
    else toast.success('Perfil atualizado!');
    setIsSaving(false);
  };

  return (
    <ClientLayout>
      <div className="max-w-md mx-auto space-y-6 animate-fade-in">
        <h1 className="text-3xl font-bold font-display">Meu Perfil</h1>

        <form onSubmit={handleSave} className="glass-card p-6 space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-12 bg-card border-border rounded-xl"
              required
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={user?.email || ''}
              disabled
              className="pl-10 h-12 bg-card border-border rounded-xl opacity-60"
            />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="pl-10 h-12 bg-card border-border rounded-xl"
            />
          </div>

          <Button type="submit" disabled={isSaving} className="w-full h-12 rounded-xl text-base font-semibold">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Perfil'}
          </Button>
        </form>
      </div>
    </ClientLayout>
  );
}
