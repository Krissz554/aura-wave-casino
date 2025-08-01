
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import "@/styles/account-deletion-lock.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LevelSyncProvider } from "@/contexts/LevelSyncContext";
import { XPSyncProvider } from "@/contexts/XPSyncContext";
import { MaintenanceProvider } from "@/contexts/MaintenanceContext";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import AccountDeletionOverlay from "@/components/AccountDeletionOverlay";
import InstantDeletionHandler from "@/components/InstantDeletionHandler";
import Index from "./pages/Index";
import Rewards from "./pages/Rewards";
import NotFound from "./pages/NotFound";
import { ProvablyFair } from "./pages/ProvablyFair";
import TermsAndConditions from "./pages/TermsAndConditions";
import ResponsibleGambling from "./pages/ResponsibleGambling";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Toaster />
    <Sonner />
    <AuthProvider>
      <LevelSyncProvider>
        <XPSyncProvider>
          <MaintenanceProvider>
          <MaintenanceOverlay />
          <AccountDeletionOverlay />
          <InstantDeletionHandler />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/roulette" element={<Index initialGame="roulette" />} />
            <Route path="/coinflip" element={<Index initialGame="coinflip" />} />
            <Route path="/tower" element={<Index initialGame="tower" />} />
            <Route path="/rewards" element={<Rewards />} />
            <Route path="/provably-fair" element={<ProvablyFair />} />
            <Route path="/terms" element={<TermsAndConditions />} />
            <Route path="/responsible-gambling" element={<ResponsibleGambling />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </MaintenanceProvider>
        </XPSyncProvider>
      </LevelSyncProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
