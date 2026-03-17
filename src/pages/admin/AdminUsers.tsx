import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Navigate } from 'react-router-dom';
import { Trash2, Mail, Phone, Pencil, Check, X, Eye, EyeOff, Shield, Scissors, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UserInfo {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  is_available: boolean;
  avatar_url: string;
  roles: string[];
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin Barbeiro',
  barber: 'Barbeiro',
  client: 'Cliente',
};

const ROLE_ICONS: Record<string, any> = {
  super_admin: Shield,
  admin: Shield,
  barber: Scissors,
  client: User,
};

export default function AdminUsers() {
  const { role, loading, user } = useAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', password: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase.functions.invoke('admin-management', {
      body: { action: 'list_all_users' },
    });
    if (!error && data) setUsers(data.users || []);
    setLoadingUsers(false);
  };

  const handleDelete = async (targetId: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover ${name}? Todos os dados serão excluídos.`)) return;
    const { data, error } = await supabase.functions.invoke('admin-management', {
      body: { action: 'delete_user', target_user_id: targetId },
    });
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao remover usuário');
      return;
    }
    toast.success('Usuário removido');
    fetchUsers();
  };

  const handleEditSave = async (targetId: string) => {
    const { full_name, email, password } = editForm;
    if (!full_name.trim() && !email.trim() && !password.trim()) {
      toast.error('Preencha ao menos um campo');
      return;
    }
    setSavingEdit(true);
    const body: any = { action: 'update_user', target_user_id: targetId };
    if (full_name.trim()) body.full_name = full_name.trim();
    if (email.trim()) body.email = email.trim();
    if (password.trim()) body.password = password.trim();

    const { data, error } = await supabase.functions.invoke('admin-management', { body });
    setSavingEdit(false);
    if (error || data?.error) {
      toast.error(data?.error || 'Erro ao atualizar');
      return;
    }
    toast.success('Usuário atualizado!');
    setEditingUser(null);
    setEditForm({ full_name: '', email: '', password: '' });
    fetchUsers();
  };

  if (loading) return null;
  if (role !== 'super_admin') return <Navigate to="/" replace />;

  const filteredUsers = filter === 'all'
    ? users
    : users.filter(u => u.roles.includes(filter));

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display">Usuários</h1>
          <p className="text-muted-foreground mt-1">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrados</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'admin', 'barber', 'client'].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'Todos' : ROLE_LABELS[f] || f}
            </Button>
          ))}
        </div>

        {loadingUsers ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-muted-foreground text-center py-12 glass-card">Nenhum usuário encontrado</p>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((u) => {
              const isSelf = u.user_id === user?.id;
              const isSuperAdmin = u.roles.includes('super_admin');

              return (
                <div key={u.user_id} className="glass-card p-4 animate-slide-up">
                  {editingUser === u.user_id ? (
                    <div className="space-y-3">
                      <Input
                        value={editForm.full_name}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        placeholder="Novo nome"
                        className="h-9 text-sm"
                      />
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="Novo email"
                        className="h-9 text-sm"
                      />
                      <div className="relative">
                        <Input
                          type={showEditPassword ? 'text' : 'password'}
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          placeholder="Nova senha (deixe vazio para manter)"
                          className="h-9 text-sm pr-9"
                        />
                        <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleEditSave(u.user_id)} disabled={savingEdit}>
                          {savingEdit ? 'Salvando...' : 'Salvar'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingUser(null); setEditForm({ full_name: '', email: '', password: '' }); }}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-sm sm:text-base truncate">{u.full_name || 'Sem nome'}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{u.email}</span>
                        </p>
                        {u.phone && (
                          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" /> {formatPhone(u.phone)}
                          </p>
                        )}
                        <div className="flex gap-1 flex-wrap mt-1">
                          {u.roles.map((r) => (
                            <Badge key={r} variant={r === 'super_admin' ? 'default' : 'secondary'} className="text-[10px]">
                              {ROLE_LABELS[r] || r}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {!isSuperAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingUser(u.user_id); setEditForm({ full_name: u.full_name, email: u.email, password: '' }); }}
                            className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.user_id, u.full_name)}
                            className="p-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
