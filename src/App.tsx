import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BarberDashboard from "./pages/barber/BarberDashboard";
import BarberSchedule from "./pages/barber/BarberSchedule";
import BarberServices from "./pages/barber/BarberServices";
import BarberWorkHours from "./pages/barber/BarberWorkHours";
import BarberFinances from "./pages/barber/BarberFinances";
import BarberClients from "./pages/barber/BarberClients";
import BarberManageBarbers from "./pages/barber/BarberManageBarbers";
import BarberProfile from "./pages/barber/BarberProfile";
import BarberSubscriptions from "./pages/barber/BarberSubscriptions";
import ClientBooking from "./pages/client/ClientBooking";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientSpending from "./pages/client/ClientSpending";
import ClientProfile from "./pages/client/ClientProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminBilling from "./pages/admin/AdminBilling";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const saved = localStorage.getItem('app-theme') || 'dark';
    const resolved = saved === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : saved;
    document.documentElement.classList.add(resolved);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            {/* Barber / Admin routes */}
            <Route path="/barber" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberDashboard /></ProtectedRoute>} />
            <Route path="/barber/schedule" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberSchedule /></ProtectedRoute>} />
            <Route path="/barber/services" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberServices /></ProtectedRoute>} />
            <Route path="/barber/work-hours" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberWorkHours /></ProtectedRoute>} />
            <Route path="/barber/finances" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberFinances /></ProtectedRoute>} />
            <Route path="/barber/clients" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberClients /></ProtectedRoute>} />
            <Route path="/barber/barbers" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberManageBarbers /></ProtectedRoute>} />
            <Route path="/barber/profile" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberProfile /></ProtectedRoute>} />
            <Route path="/barber/subscriptions" element={<ProtectedRoute allowedRoles={['barber', 'admin']}><BarberSubscriptions /></ProtectedRoute>} />
            {/* Client routes */}
            <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientBooking /></ProtectedRoute>} />
            <Route path="/client/appointments" element={<ProtectedRoute allowedRoles={['client']}><ClientAppointments /></ProtectedRoute>} />
            <Route path="/client/spending" element={<ProtectedRoute allowedRoles={['client']}><ClientSpending /></ProtectedRoute>} />
            <Route path="/client/profile" element={<ProtectedRoute allowedRoles={['client']}><ClientProfile /></ProtectedRoute>} />
            {/* Super Admin routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={['super_admin']}><AdminBilling /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
