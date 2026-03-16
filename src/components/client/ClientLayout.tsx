import { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ClientSidebar } from './ClientSidebar';

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ClientSidebar />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
