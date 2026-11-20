import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { LandingPage } from './pages/public/LandingPage';
import { RegistrationPage } from './pages/public/RegistrationPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminBranchesPage } from './pages/admin/AdminBranchesPage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes with Public Header & Footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Admin Auth Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin Protected Routes with Admin Sidebar & Header */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="branches" element={<AdminBranchesPage />} />
      </Route>
    </Routes>
  );
};

export default App;

