import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { CmsProvider } from "@/contexts/CmsContext";
import MiniPlayer from "@/components/MiniPlayer";
import PageTransition from "@/components/PageTransition";
import SubscriptionRequiredDialog from "@/components/SubscriptionRequiredDialog";
import CmsEditBar from "@/components/cms/CmsEditBar";
import CmsAutoEditor from "@/components/cms/CmsAutoEditor";
import Index from "./pages/Index";

import TrackDetail from "./pages/TrackDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Downloads from "./pages/Downloads";
import Admin from "./pages/Admin";
import AdminTracks from "./pages/AdminTracks";
import AdminUsers from "./pages/AdminUsers";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminBranding from "./pages/AdminBranding";
import AdminScreenshotStudio from "./pages/AdminScreenshotStudio";
import AdminPopups from "./pages/AdminPopups";
import AdminHomeWidgets from "./pages/AdminHomeWidgets";
import PopupHost from "@/components/PopupHost";
import AdminAuditLog from "./pages/AdminAuditLog";
import AdminSupport from "./pages/AdminSupport";
import AdminPlans from "./pages/AdminPlans";
import AdminPromoCodes from "./pages/AdminPromoCodes";
import AdminArtists from "./pages/AdminArtists";
import AdminQueue from "./pages/AdminQueue";
import DjDashboard from "./pages/DjDashboard";
import DjTracks from "./pages/DjTracks";
import DjUpload from "./pages/DjUpload";
import DjEdit from "./pages/DjEdit";
import Pricing from "./pages/Pricing";
import ArtistDetail from "./pages/ArtistDetail";
import Remixers from "./pages/Remixers";


import NewReleases from "./pages/NewReleases";
import Stems from "./pages/Stems";
import Shorts from "./pages/Shorts";
import AdminShorts from "./pages/AdminShorts";
import Playlists from "./pages/Playlists";
import AdminPlaylists from "./pages/AdminPlaylists";
import NotFound from "./pages/NotFound";


const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingProvider>
        <PlayerProvider>
          <CmsProvider>
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
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/tracks" element={<AdminTracks />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/artists" element={<AdminArtists />} />
              <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
              <Route path="/admin/branding" element={<AdminBranding />} />
              <Route path="/admin/screenshot-studio" element={<AdminScreenshotStudio />} />
              <Route path="/admin/popups" element={<AdminPopups />} />
              <Route path="/admin/widgets" element={<AdminHomeWidgets />} />
              <Route path="/admin/audit" element={<AdminAuditLog />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/admin/queue" element={<AdminQueue />} />
              <Route path="/dj" element={<DjDashboard />} />
              <Route path="/dj/tracks" element={<DjTracks />} />
              <Route path="/dj/upload" element={<DjUpload />} />
              <Route path="/dj/edit/:id" element={<DjEdit />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/artists" element={<Navigate to="/remixers" replace />} />
              <Route path="/artists/:slug" element={<Navigate to="/remixers" replace />} />
              <Route path="/remixers" element={<Remixers />} />
              <Route path="/remixers/:slug" element={<ArtistDetail kind="remixer" />} />

              <Route path="/genres" element={<Navigate to="/new" replace />} />
              <Route path="/top" element={<Navigate to="/new" replace />} />
              <Route path="/new" element={<NewReleases />} />
              <Route path="/stems" element={<Stems />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/admin/shorts" element={<AdminShorts />} />
              <Route path="/playlists" element={<Playlists />} />
              <Route path="/admin/playlists" element={<AdminPlaylists />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <PageTransition />
            <MiniPlayer />
            <SubscriptionRequiredDialog />
            <CmsEditBar />
            <CmsAutoEditor />
            <PopupHost />
          </BrowserRouter>
          </TooltipProvider>
          </CmsProvider>
        </PlayerProvider>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
