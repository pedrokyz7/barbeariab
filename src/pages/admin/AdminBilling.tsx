import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Navigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, ExternalLink, RefreshCw, Shield, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BarberAdmin {
  user_id: string;
  full_name: string;
  email: string;
  roles: string[];
}

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_id?: string;
  subscription_end?: string;
}

export default function AdminBilling() {
  const { role, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [barberAdmins, setBarberAdmins] = useState<BarberAdmin[]>([]);
  const [subscriptions, setSubscriptions] = useState<Record<string, SubscriptionInfo>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [checkingEmail, setCheckingEmail] = useState<string | null>(null);
  const [creatingCheckout, setCreatingCheckout] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura criada com sucesso!');
    }
    if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout cancelado');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchBarberAdmins();
  }, []);

  const fetchBarberAdmins = async () => {
    const { data, error } = await supabase.functions.invoke('admin-management', {
      body: { action: 'list_all_users' },
    });
    if (!error && data?.users) {
      // Filter to only admin roles (not barbers, not super_admin, not client)
      const admins = data.users.filter((u: any) =>
        u.roles.some((r: string) => r === 'admin')
      );
      setBarberAdmins(admins);
      // Check subscriptions for all admins
      for (const admin of admins) {
        checkSubscription(admin.email, admin.user_id);
      }
    }
    setLoadingData(false);
  };

  const checkSubscription = async (email: string, userId: string) => {
    setCheckingEmail(userId);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        body: { email },
      });
      if (!error && data) {
        setSubscriptions(prev => ({ ...prev, [userId]: data }));
      }
    } catch {
      // ignore
    }
    setCheckingEmail(null);
  };

  const handleCharge = async (email: string, userId: string, fullName: string) => {
    setCreatingCheckout(userId);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Assinatura Pendente',
        message: `Sua assinatura mensal de R$ 99,90 precisa ser paga. Entre em contato com o administrador ou acesse sua área para regularizar.`,
        type: 'billing',
      });
      if (error) {
        toast.error('Erro ao enviar cobrança');
      } else {
        toast.success(`Cobrança enviada para ${fullName || email}`);
      }
    } catch {
      toast.error('Erro ao enviar cobrança');
    }
    setCreatingCheckout(null);
  };

  const handleManageSubscription = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: { email, return_url: window.location.origin },
      });
      if (error || data?.error) {
        toast.error(data?.error || 'Erro ao abrir portal');
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      toast.error('Erro ao abrir portal');
    }
  };

  if (loading) return null;
  if (role !== 'super_admin') return <Navigate to="/" replace />;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const activeCount = Object.values(subscriptions).filter(s => s.subscribed).length;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display">Cobranças</h1>
          <p className="text-muted-foreground mt-1">Gerencie as assinaturas dos administradores e barbeiros</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 text-center">
            <CreditCard className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{barberAdmins.length}</p>
            <p className="text-xs text-muted-foreground">Total Barbeiros/Admins</p>
          </div>
          <div className="glass-card p-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">Assinaturas Ativas</p>
          </div>
          <div className="glass-card p-4 text-center col-span-2 sm:col-span-1">
            <XCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{barberAdmins.length - activeCount}</p>
            <p className="text-xs text-muted-foreground">Sem Assinatura</p>
          </div>
        </div>

        {/* Refresh all */}
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={fetchBarberAdmins} disabled={loadingData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Atualizar Status
          </Button>
        </div>

        {/* Barber Admins List */}
        {loadingData ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : barberAdmins.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-muted-foreground">Nenhum barbeiro ou admin cadastrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {barberAdmins.map((admin) => {
              const sub = subscriptions[admin.user_id];
              const isActive = sub?.subscribed;
              const isChecking = checkingEmail === admin.user_id;
              const isCreating = creatingCheckout === admin.user_id;
              const RoleIcon = admin.roles.includes('admin') ? Shield : Scissors;

              return (
                <div key={admin.user_id} className="glass-card p-4 animate-slide-up">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <RoleIcon className="w-4 h-4 text-primary shrink-0" />
                        <p className="font-medium text-sm sm:text-base truncate">{admin.full_name || 'Sem nome'}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {admin.roles.map(r => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {r === 'admin' ? 'Admin Barbeiro' : 'Barbeiro'}
                          </Badge>
                        ))}
                        {isChecking ? (
                          <Badge variant="outline" className="text-[10px]">Verificando...</Badge>
                        ) : isActive ? (
                          <Badge variant="default" className="text-[10px] bg-primary/20 text-primary border-primary/30">
                            <CheckCircle className="w-3 h-3 mr-1" /> Ativo
                          </Badge>
                        ) : sub ? (
                          <Badge variant="destructive" className="text-[10px]">
                            <XCircle className="w-3 h-3 mr-1" /> Inativo
                          </Badge>
                        ) : null}
                      </div>
                      {isActive && sub?.subscription_end && (
                        <p className="text-[11px] text-muted-foreground">
                          Próxima cobrança: {formatDate(sub.subscription_end)}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManageSubscription(admin.email)}
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                          Gerenciar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleCharge(admin.email, admin.user_id, admin.full_name)}
                          disabled={isCreating}
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                          {isCreating ? 'Enviando...' : 'Cobrar'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => checkSubscription(admin.email, admin.user_id)}
                        disabled={isChecking}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="glass-card p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Plano: <span className="font-medium text-foreground">R$ 99,90/mês por barbearia</span> • Pagamentos processados via Stripe
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
