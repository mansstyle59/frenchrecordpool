import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import MiniPlayer from "@/components/MiniPlayer";
import SubscriptionRequiredDialog from "@/components/SubscriptionRequiredDialog";
import Index from "./pages/Index";

import TrackDetail from "./pages/TrackDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminTracks from "./pages/AdminTracks";
import AdminUsers from "./pages/AdminUsers";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminBranding from "./pages/AdminBranding";
import AdminAuditLog from "./pages/AdminAuditLog";
import AdminPlans from "./pages/AdminPlans";
import AdminPromoCodes from "./pages/AdminPromoCodes";
import AdminArtists from "./pages/AdminArtists";
import Pricing from "./pages/Pricing";
import Artists from "./pages/Artists";
import Genres from "./pages/Genres";

import NewReleases from "./pages/NewReleases";
import Stems from "./pages/Stems";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingProvider>
        <PlayerProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tracks" element={<Navigate to="/new" replace />} />
              <Route path="/tracks/:id" element={<TrackDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/tracks" element={<AdminTracks />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/artists" element={<AdminArtists />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
              <Route path="/admin/branding" element={<AdminBranding />} />
              <Route path="/admin/audit" element={<AdminAuditLog />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/artists" element={<Artists />} />

              <Route path="/genres" element={<Genres />} />
              <Route path="/top" element={<Navigate to="/new" replace />} />
              <Route path="/new" element={<NewReleases />} />
              <Route path="/stems" element={<Stems />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MiniPlayer />
            <SubscriptionRequiredDialog />
          </BrowserRouter>
          </TooltipProvider>
        </PlayerProvider>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
