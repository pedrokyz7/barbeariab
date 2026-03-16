import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import BarberDashboard from "./pages/barber/BarberDashboard";
import BarberSchedule from "./pages/barber/BarberSchedule";
import BarberServices from "./pages/barber/BarberServices";
import BarberWorkHours from "./pages/barber/BarberWorkHours";
import BarberFinances from "./pages/barber/BarberFinances";
import ClientBooking from "./pages/client/ClientBooking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/barber" element={<BarberDashboard />} />
            <Route path="/barber/schedule" element={<BarberSchedule />} />
            <Route path="/barber/services" element={<BarberServices />} />
            <Route path="/barber/work-hours" element={<BarberWorkHours />} />
            <Route path="/barber/finances" element={<BarberFinances />} />
            <Route path="/client" element={<ClientBooking />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
