import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
