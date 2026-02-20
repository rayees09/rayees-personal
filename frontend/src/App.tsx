import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Prayers from './pages/Prayers';
import Ramadan from './pages/Ramadan';
import Quran from './pages/Quran';
import QuranGoal from './pages/QuranGoal';
import Learning from './pages/Learning';
import Points from './pages/Points';
import MyTasks from './pages/MyTasks';
import Reminders from './pages/Reminders';
import Settings from './pages/Settings';
import Zakat from './pages/Zakat';
import Expenses from './pages/Expenses';
import FamilyMembers from './pages/FamilyMembers';
// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import FamilyList from './pages/admin/FamilyList';
import EmailConfig from './pages/admin/EmailConfig';
import FeatureManager from './pages/admin/FeatureManager';
import TokenUsage from './pages/admin/TokenUsage';
import FamilyFeatures from './pages/admin/FamilyFeatures';
import AdminManagement from './pages/admin/AdminManagement';
import IssuesList from './pages/admin/IssuesList';
import ActivityLogs from './pages/admin/ActivityLogs';
// Landing page
import Landing from './pages/Landing';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/welcome" />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Navigate to="/" /> : <>{children}</>;
}

function App() {
  return (
    <Routes>
      {/* Public routes - redirect to dashboard if already logged in */}
      <Route path="/welcome" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Admin routes */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/families" element={<FamilyList />} />
      <Route path="/admin/email-config" element={<EmailConfig />} />
      <Route path="/admin/features" element={<FeatureManager />} />
      <Route path="/admin/usage" element={<TokenUsage />} />
      <Route path="/admin/admins" element={<AdminManagement />} />
      <Route path="/admin/families/:familyId/features" element={<FamilyFeatures />} />
      <Route path="/admin/issues" element={<IssuesList />} />
      <Route path="/admin/activity-logs" element={<ActivityLogs />} />

      {/* Protected family routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="my-tasks" element={<MyTasks />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="prayers" element={<Prayers />} />
        <Route path="ramadan" element={<Ramadan />} />
        <Route path="quran" element={<Quran />} />
        <Route path="quran-goal" element={<QuranGoal />} />
        <Route path="learning" element={<Learning />} />
        <Route path="points" element={<Points />} />
        <Route path="zakat" element={<Zakat />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="family" element={<FamilyMembers />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
