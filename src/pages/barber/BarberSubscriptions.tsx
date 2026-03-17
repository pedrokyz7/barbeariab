import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BarberLayout } from '@/components/barber/BarberLayout';
import { Navigate } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, Clock, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PaymentRecord {
  id: string;
  amount: number;
  billing_period: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  subscription_activated: boolean;
}

interface BillingSettings {
  amount: number;
  billing_period: string;
}

export default function BarberSubscriptions() {
  const { role, loading, user } = useAuth();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<BillingSettings | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoadingData(true);
    const [paymentsRes, settingsRes] = await Promise.all([
      supabase
        .from('billing_payments')
        .select('*')
        .eq('admin_user_id', user!.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('billing_settings')
        .select('amount, billing_period')
        .limit(1)
        .maybeSingle(),
    ]);

    if (!paymentsRes.error && paymentsRes.data) {
      setPayments(paymentsRes.data as PaymentRecord[]);
    }
    if (!settingsRes.error && settingsRes.data) {
      setSettings(settingsRes.data as BillingSettings);
    }
    setLoadingData(false);
  };

  if (loading) return null;
  if (role !== 'admin' && role !== 'barber') return <Navigate to="/" replace />;

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const periodLabel = settings?.billing_period === 'quarterly' ? 'trimestre' : 'mês';
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  // Use most recent payment (any) for last payment date, and most recent activated for subscription status
  const lastPayment = payments.length > 0 ? payments[0] : null;
  const lastActivated = payments.find(p => p.subscription_activated);
  const isActive = !!lastActivated;

  const getNextDueDate = () => {
    if (!lastActivated) return null;
    const date = new Date(lastActivated.created_at);
    if (settings?.billing_period === 'quarterly') {
      date.setMonth(date.getMonth() + 3);
    } else {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  };

  const nextDue = getNextDueDate();
  const isOverdue = nextDue ? nextDue < new Date() : true;

  const methodLabels: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    transferencia: 'Transferência',
    cartao: 'Cartão',
    boleto: 'Boleto',
  };

  return (
    <BarberLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display">Assinaturas</h1>
          <p className="text-muted-foreground mt-1">Acompanhe sua assinatura e histórico de pagamentos</p>
        </div>

        {loadingData ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : (
          <>
            {/* Current subscription status */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Assinatura Atual
                </h2>
                {isActive && !isOverdue ? (
                  <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Ativa
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" /> {isOverdue ? 'Vencida' : 'Inativa'}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="text-sm font-medium">
                    {settings ? `${formatCurrency(settings.amount)}/${periodLabel}` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Total Pago</p>
                  <p className="text-sm font-medium">{formatCurrency(totalPaid)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Último Pagamento</p>
                  <p className="text-sm font-medium">
                    {lastPayment ? `${formatDate(lastPayment.created_at)} — ${formatCurrency(Number(lastPayment.amount))}` : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Próximo Vencimento</p>
                  <p className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                    {nextDue ? formatDate(nextDue.toISOString()) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                Histórico de Pagamentos
              </h2>

              {payments.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">Nenhum pagamento registrado</p>
                </div>
              ) : (
                payments.map((payment) => (
                  <div key={payment.id} className="glass-card p-4 animate-slide-up">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{formatCurrency(Number(payment.amount))}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {methodLabels[payment.payment_method] || payment.payment_method}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {payment.billing_period === 'quarterly' ? 'Trimestral' : 'Mensal'}
                          </Badge>
                          {payment.subscription_activated && (
                            <Badge variant="default" className="text-[10px] bg-primary/20 text-primary border-primary/30">
                              <CheckCircle className="w-3 h-3 mr-1" /> Ativou assinatura
                            </Badge>
                          )}
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground truncate">{payment.notes}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(payment.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </BarberLayout>
  );
}
