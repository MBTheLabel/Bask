import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './lib/authStore';
import { Layout } from './components/layout';

// Pages
import LandingPage from './pages/Landing';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import CuratedTripsPage from './pages/CuratedTrips';
import TripDetailPage from './pages/TripDetail';
import MyTripsPage from './pages/MyTrips';
import NewTripRequestPage from './pages/NewTripRequest';
import ConciergePage from './pages/Concierge';
import PartnerHomesPage from './pages/PartnerHomes';
import HomeDetailPage from './pages/HomeDetail';
import PartnerPerksPage from './pages/PartnerPerks';
import GiftShopPage from './pages/GiftShop';
import BeachMapPage from './pages/BeachMap';
import MembershipPage from './pages/Membership';
import ProfilePage from './pages/Profile';
import BlogPage from './pages/Blog';
import AdminPage from './pages/Admin';
import MembershipGatePage from './pages/MembershipGate';

import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 min
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Route Guards ─────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Membership gate — skip for admin and already-selected users
  if (!user?.hasSelectedMembership && !user?.isAdmin && location.pathname !== '/select-membership') {
    return <Navigate to="/select-membership" replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user?.isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

// ─── App ──────────────────────────────────────────────────────
const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/membership" element={<MembershipPage />} />
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          {/* Membership gate */}
          <Route path="/select-membership" element={
            <ProtectedRoute><MembershipGatePage /></ProtectedRoute>
          } />

          {/* Protected member routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/curated-trips" element={<ProtectedRoute><CuratedTripsPage /></ProtectedRoute>} />
          <Route path="/curated-trips/:id" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
          <Route path="/my-trips" element={<ProtectedRoute><MyTripsPage /></ProtectedRoute>} />
          <Route path="/new-trip" element={<ProtectedRoute><NewTripRequestPage /></ProtectedRoute>} />
          <Route path="/concierge" element={<ProtectedRoute><ConciergePage /></ProtectedRoute>} />
          <Route path="/partner-homes" element={<ProtectedRoute><PartnerHomesPage /></ProtectedRoute>} />
          <Route path="/partner-homes/:id" element={<ProtectedRoute><HomeDetailPage /></ProtectedRoute>} />
          <Route path="/partner-perks" element={<ProtectedRoute><PartnerPerksPage /></ProtectedRoute>} />
          <Route path="/gift-shop" element={<ProtectedRoute><GiftShopPage /></ProtectedRoute>} />
          <Route path="/beach-map" element={<ProtectedRoute><BeachMapPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
              <h1 className="font-display text-6xl text-bask-terracotta mb-4">404</h1>
              <p className="font-body text-bask-muted text-lg mb-6">This page has sailed away.</p>
              <a href="/" className="btn-primary">Return Home</a>
            </div>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
