import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAuthenticated } from "@/lib/store";
import BottomNav from "@/components/BottomNav";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import DriversPage from "@/pages/Drivers";
import DriverDetailPage from "@/pages/DriverDetail";
import AccountingPage from "@/pages/Accounting";
import SettlementsPage from "@/pages/Settlements";
import ReportsPage from "@/pages/Reports";
import AnalyticsPage from "@/pages/Analytics";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-lg pb-20">
      <div className="px-4 py-2">{children}</div>
      <BottomNav />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
          <Route path="/drivers" element={<ProtectedRoute><AppLayout><DriversPage /></AppLayout></ProtectedRoute>} />
          <Route path="/drivers/:id" element={<ProtectedRoute><AppLayout><DriverDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/accounting" element={<ProtectedRoute><AppLayout><AccountingPage /></AppLayout></ProtectedRoute>} />
          <Route path="/settlements" element={<ProtectedRoute><AppLayout><SettlementsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/settlementsNew" element={<ProtectedRoute><AppLayout><SettlementsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
