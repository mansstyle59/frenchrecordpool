import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import MiniPlayer from "@/components/MiniPlayer";
import Index from "./pages/Index";
import Tracks from "./pages/Tracks";
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
import Artists from "./pages/Artists";
import Genres from "./pages/Genres";
import TopTracks from "./pages/TopTracks";
import NewReleases from "./pages/NewReleases";
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
              <Route path="/tracks" element={<Tracks />} />
              <Route path="/tracks/:id" element={<TrackDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/tracks" element={<AdminTracks />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/branding" element={<AdminBranding />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/genres" element={<Genres />} />
              <Route path="/top" element={<TopTracks />} />
              <Route path="/new" element={<NewReleases />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <MiniPlayer />
          </BrowserRouter>
          </TooltipProvider>
        </PlayerProvider>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
