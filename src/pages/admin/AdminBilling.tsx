import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Navigate } from 'react-router-dom';
import { CreditCard } from 'lucide-react';

export default function AdminBilling() {
  const { role, loading } = useAuth();

  if (loading) return null;
  if (role !== 'super_admin') return <Navigate to="/" replace />;

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold font-display">Cobranças</h1>
          <p className="text-muted-foreground mt-1">Gerencie as assinaturas dos administradores e barbeiros</p>
        </div>

        <div className="glass-card p-12 text-center space-y-4">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Configurando integração de pagamentos...</p>
        </div>
      </div>
    </AdminLayout>
  );
}
