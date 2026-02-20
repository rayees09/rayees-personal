import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Home, CheckSquare, Moon, BookOpen, GraduationCap, Star, LogOut, Menu, X,
  Briefcase, Bell, Target, Settings, Coins, Wallet, Users, HelpCircle, Sun
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api, { familyApi } from '../services/api';
import ReportIssue from './ReportIssue';
import { useThemeStore } from '../store/themeStore';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/tasks', icon: CheckSquare, label: 'Family Tasks', featureKey: 'tasks' },
  { path: '/my-tasks', icon: Briefcase, label: 'My Tasks', parentOnly: true, featureKey: 'my_tasks' },
  { path: '/reminders', icon: Bell, label: 'Reminders', featureKey: 'reminders' },
  { path: '/prayers', icon: Moon, label: 'Prayers', featureKey: 'prayers' },
  { path: '/ramadan', icon: Moon, label: 'Ramadan', featureKey: 'ramadan' },
  { path: '/quran-goal', icon: Target, label: 'Quran Goal', featureKey: 'quran' },
  { path: '/quran', icon: BookOpen, label: 'Memorization', featureKey: 'quran' },
  { path: '/zakat', icon: Coins, label: 'Zakat', parentOnly: true, featureKey: 'zakat' },
  { path: '/learning', icon: GraduationCap, label: 'Learning', featureKey: 'learning' },
  { path: '/points', icon: Star, label: 'Points', featureKey: 'points' },
  { path: '/expenses', icon: Wallet, label: 'Expenses', parentOnly: true, featureKey: 'expenses' },
  { path: '/family', icon: Users, label: 'Family Members', parentOnly: true },
  { path: '/settings', icon: Settings, label: 'Settings', parentOnly: true },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [familyName, setFamilyName] = useState('Family Hub');
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({});
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const fetchFamily = async () => {
      try {
        const response = await api.get('/family/me');
        setFamilyName(response.data.name || 'Family Hub');
      } catch (err) {
        console.error('Failed to fetch family:', err);
      }
    };
    const fetchFeatures = async () => {
      try {
        const features = await familyApi.getFeatures();
        setEnabledFeatures(features);
      } catch (err) {
        console.error('Failed to fetch features:', err);
      }
    };
    fetchFamily();
    fetchFeatures();
  }, []);

  // Filter nav items based on enabled features
  const filteredNavItems = navItems.filter((item) => {
    // Always show items without featureKey (Dashboard, Family Members, Settings)
    if (!item.featureKey) return true;
    // Show item if feature is enabled (default to true if not set)
    return enabledFeatures[item.featureKey] !== false;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
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
          <div className="flex items-center gap-4 ml-auto">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-white/10 rounded-lg transition"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-islamic-gold rounded-full flex items-center justify-center font-bold text-gray-800">
                  {user?.name?.charAt(0)}
                </div>
                <span className="hidden sm:inline">{user?.name}</span>
                {user?.role === 'child' && (
                  <span className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-sm">
                    {user.total_points} pts
                  </span>
                )}
              </button>

              {/* Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 py-1">
                    <div className="px-4 py-2 border-b dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings size={16} />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 bg-white dark:bg-gray-800 shadow-lg min-h-[calc(100vh-72px)] transition-colors duration-200">
          <nav className="p-4 space-y-2">
            {filteredNavItems
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
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={20} />
                    {item.label}
                  </Link>
                );
              })}
            {/* Report Issue Button */}
            <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowReportIssue(true)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg transition text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
              >
                <HelpCircle size={20} />
                Report Issue
              </button>
            </div>
          </nav>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-lg transition-colors duration-200">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-bold text-islamic-green">Menu</h2>
              </div>
              <nav className="p-4 space-y-2">
                {filteredNavItems
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
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon size={20} />
                        {item.label}
                      </Link>
                    );
                  })}
                {/* Report Issue Button - Mobile */}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowReportIssue(true);
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
                  >
                    <HelpCircle size={20} />
                    Report Issue
                  </button>
                </div>
              </nav>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 dark:text-gray-100 transition-colors duration-200">
          <Outlet />
        </main>
      </div>

      {/* Report Issue Modal */}
      <ReportIssue isOpen={showReportIssue} onClose={() => setShowReportIssue(false)} />
    </div>
  );
}
