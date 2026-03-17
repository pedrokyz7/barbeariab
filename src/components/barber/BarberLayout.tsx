import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarberSidebar } from './BarberSidebar';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.jpg';

export function BarberLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || '';
  const shortName = fullName.trim().split(/\s+/).slice(0, 2).join(' ');

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
