import { Calendar, DollarSign, Scissors, Clock, LogOut, LayoutDashboard } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const items = [
  { title: 'Dashboard', url: '/barber', icon: LayoutDashboard },
  { title: 'Agenda', url: '/barber/schedule', icon: Calendar },
  { title: 'Serviços', url: '/barber/services', icon: Scissors },
  { title: 'Horários', url: '/barber/work-hours', icon: Clock },
  { title: 'Financeiro', url: '/barber/finances', icon: DollarSign },
];

export function BarberSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-display text-lg tracking-tight px-4 py-6">
            {!collapsed && (
              <span className="flex items-center gap-2">
                <Scissors className="w-5 h-5 text-primary" />
                BarberPro
              </span>
            )}
            {collapsed && <Scissors className="w-5 h-5 text-primary" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/barber'}
                      className="hover:bg-accent/50 rounded-xl px-3 py-2.5"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button
                    onClick={signOut}
                    className="flex items-center w-full hover:bg-destructive/10 text-destructive rounded-xl px-3 py-2.5"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    {!collapsed && <span>Sair</span>}
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
