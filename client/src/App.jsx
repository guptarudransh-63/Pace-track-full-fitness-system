import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ActivityDetailPage from './pages/ActivityDetailPage.jsx';
import RecordUploadPage from './pages/RecordUploadPage.jsx';
import TrainingAnalyticsPage from './pages/TrainingAnalyticsPage.jsx';
import SegmentsExplorePage from './pages/SegmentsExplorePage.jsx';
import SegmentDetailPage from './pages/SegmentDetailPage.jsx';
import ClubsPage from './pages/ClubsPage.jsx';
import ClubDetailPage from './pages/ClubDetailPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import { useAuthStore } from './stores/authStore.js';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/activities/:id" element={<ActivityDetailPage />} />
          <Route
            path="/record"
            element={
              <ProtectedRoute>
                <RecordUploadPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <TrainingAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/explore" element={<SegmentsExplorePage />} />
          <Route path="/segments/:id" element={<SegmentDetailPage />} />
          <Route path="/clubs" element={<ClubsPage />} />
          <Route path="/clubs/:id" element={<ClubDetailPage />} />
          <Route path="/athletes/:userId?" element={<ProfilePage />} />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
