import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Home, CheckSquare, Moon, BookOpen, GraduationCap, Star, LogOut, Menu, X,
  Briefcase, Bell, Target, Settings, Coins, Wallet, Users
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../services/api';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/tasks', icon: CheckSquare, label: 'Family Tasks' },
  { path: '/my-tasks', icon: Briefcase, label: 'My Tasks', parentOnly: true },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/prayers', icon: Moon, label: 'Prayers' },
  { path: '/ramadan', icon: Moon, label: 'Ramadan' },
  { path: '/quran-goal', icon: Target, label: 'Quran Goal' },
  { path: '/quran', icon: BookOpen, label: 'Memorization' },
  { path: '/zakat', icon: Coins, label: 'Zakat', parentOnly: true },
  { path: '/learning', icon: GraduationCap, label: 'Learning' },
  { path: '/points', icon: Star, label: 'Points' },
  { path: '/expenses', icon: Wallet, label: 'Expenses', parentOnly: true },
  { path: '/family', icon: Users, label: 'Family Members', parentOnly: true },
  { path: '/settings', icon: Settings, label: 'Settings', parentOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [familyName, setFamilyName] = useState('Family Hub');

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const response = await api.get('/family/me');
        setFamilyName(response.data.name || 'Family Hub');
      } catch (err) {
        console.error('Failed to fetch family:', err);
      }
    };
    fetchFamily();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-islamic-green text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-xl font-bold">{familyName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-islamic-gold rounded-full flex items-center justify-center font-bold">
                {user?.name?.charAt(0)}
              </div>
              <span className="hidden sm:inline">{user?.name}</span>
              {user?.role === 'child' && (
                <span className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-sm">
                  {user.total_points} pts
                </span>
              )}
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white shadow-lg min-h-[calc(100vh-72px)]">
          <nav className="p-4 space-y-2">
            {navItems
              .filter((item) => !item.parentOnly || user?.role === 'parent')
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-islamic-green text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
          </nav>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg">
              <div className="p-4 border-b">
                <h2 className="text-lg font-bold text-islamic-green">Menu</h2>
              </div>
              <nav className="p-4 space-y-2">
                {navItems
                  .filter((item) => !item.parentOnly || user?.role === 'parent')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          isActive
                            ? 'bg-islamic-green text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={20} />
                        {item.label}
                      </Link>
                    );
                  })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
