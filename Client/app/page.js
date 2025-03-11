'use client'
import DashboardPage from '@/component/UserDashboard';
import AuthGuard from '@/component/AuthGuide';

export default function ProtectedDashboardPage() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}