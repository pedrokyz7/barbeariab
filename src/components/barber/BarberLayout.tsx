import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarberSidebar } from './BarberSidebar';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.jpg';

function getShortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0]} ${parts[1]}`;
}

export function BarberLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const name = user?.user_metadata?.full_name || '';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <BarberSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 gap-3">
            <SidebarTrigger />
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
            {name && (
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {getShortName(name)}
              </span>
            )}
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
