import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarberSidebar } from './BarberSidebar';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import { Lock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.jpg';

export function BarberLayout({ children }: { children: ReactNode }) {
  const { user, isFrozen, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fullName = user?.user_metadata?.full_name || '';
  const shortName = fullName.trim().split(/\s+/).slice(0, 2).join(' ');

  const isSubscriptionsPage = location.pathname === '/barber/subscriptions';
  const showFrozenBlock = isFrozen && !isSubscriptionsPage;

  if (showFrozenBlock) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <img src={logo} alt="Logo" className="w-24 h-24 rounded-2xl object-cover mb-6" />
        <Lock className="w-20 h-20 text-destructive mb-4" />
        <h2 className="text-3xl font-bold text-destructive mb-2">Conta Congelada</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Sua conta foi congelada pelo administrador. Entre em contato com o suporte ou regularize sua situação.
        </p>
        <div className="flex gap-3">
          <Button variant="default" onClick={() => navigate('/barber/subscriptions')}>
            Ir para Assinaturas
          </Button>
          <Button variant="outline" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <BarberSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3">
            <SidebarTrigger />
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            {shortName && (
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {shortName}
              </span>
            )}
            <div className="ml-auto">
              <NotificationBell />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
