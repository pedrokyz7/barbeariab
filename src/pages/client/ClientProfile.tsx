import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClientLayout } from '@/components/client/ClientLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Phone, Mail, Save, Camera } from 'lucide-react';
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('full_name, phone, avatar_url').eq('user_id', user.id).single();
    if (data) {
      setFullName(data.full_name || '');
      setPhone(data.phone ? formatPhone(data.phone) : '');
      setAvatarUrl(data.avatar_url || null);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }

    setIsUploading(true);
    const filePath = `${user.id}/avatar.${file.name.split('.').pop()}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error('Erro ao enviar foto');
      setIsUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const newUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: newUrl }).eq('user_id', user.id);

    setAvatarUrl(newUrl);
    toast.success('Foto atualizada!');
    setIsUploading(false);
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
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden bg-card border-2 border-border cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-xs text-primary hover:underline"
            >
              {isUploading ? 'Enviando...' : 'Alterar foto'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>

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
