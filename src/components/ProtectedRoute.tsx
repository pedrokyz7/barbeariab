import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    // Redirect to correct panel
    if (role === 'super_admin') return <Navigate to="/admin" replace />;
    if (role === 'admin' || role === 'barber') return <Navigate to="/barber" replace />;
    if (role === 'client') return <Navigate to="/client" replace />;
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
