import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { tasksApi, islamicApi, authApi } from '../services/api';
import { format } from 'date-fns';
import { CheckCircle, Circle, Moon, BookOpen, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tasks } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: () => tasksApi.getTasks({ assigned_to: user?.id }),
    enabled: !!user,
  });

  const { data: prayers } = useQuery({
    queryKey: ['prayers', user?.id, today],
    queryFn: () => islamicApi.getDailyPrayers(user!.id, today),
    enabled: !!user,
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
  });

  const pendingTasks = tasks?.filter((t: any) => t.status === 'pending') || [];
  const completedToday = tasks?.filter(
    (t: any) => t.status === 'completed' && t.completed_at?.startsWith(today)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-islamic-green to-teal-600 text-white rounded-2xl p-6 shadow-lg">
        <h1 className="text-2xl font-bold">
          Assalamu Alaikum, {user?.name}!
        </h1>
        <p className="text-teal-100 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
        {user?.role === 'child' && (
          <div className="mt-4 flex items-center gap-2">
            <Star className="text-yellow-400" fill="currentColor" />
            <span className="text-xl font-bold">{user.total_points}</span>
            <span className="text-teal-100">points</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/tasks"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTasks.length}</p>
              <p className="text-sm text-gray-500">Pending Tasks</p>
            </div>
          </div>
        </Link>

        <Link
          to="/prayers"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
              <Moon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {prayers?.completed_count || 0}/{prayers?.total_count || 5}
              </p>
              <p className="text-sm text-gray-500">Prayers Today</p>
            </div>
          </div>
        </Link>

        <Link
          to="/learning"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedToday.length}</p>
              <p className="text-sm text-gray-500">Done Today</p>
            </div>
          </div>
        </Link>

        <Link
          to="/ramadan"
          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold">Ramadan</p>
              <p className="text-sm text-gray-500">Track Progress</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Today's Tasks */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Today's Tasks</h2>
          <Link to="/tasks" className="text-islamic-green text-sm hover:underline">
            View All
          </Link>
        </div>
        <div className="p-4 space-y-3">
          {pendingTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No pending tasks. Great job!
            </p>
          ) : (
            pendingTasks.slice(0, 5).map((task: any) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <Circle className="text-gray-300" size={20} />
                <div className="flex-1">
                  <p className="font-medium">{task.title}</p>
                  {task.due_date && (
                    <p className="text-sm text-gray-500">
                      Due: {format(new Date(task.due_date), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm">
                  +{task.points} pts
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Prayer Status */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Prayer Status</h2>
          <Link to="/prayers" className="text-islamic-green text-sm hover:underline">
            Update
          </Link>
        </div>
        <div className="p-4">
          <div className="flex justify-between">
            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => {
              const prayerData = prayers?.prayers?.find(
                (p: any) => p.prayer_name === prayer.toLowerCase()
              );
              const isPrayed = prayerData?.status !== 'not_prayed';

              return (
                <div key={prayer} className="text-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 ${
                      isPrayed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isPrayed ? <CheckCircle size={24} /> : <Circle size={24} />}
                  </div>
                  <p className="text-xs font-medium">{prayer}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Family Overview (for parents) */}
      {user?.role === 'parent' && family && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg">Family Overview</h2>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {family
              .filter((m: any) => m.role === 'child')
              .map((child: any) => (
                <div
                  key={child.id}
                  className="border rounded-lg p-4 hover:border-islamic-green transition"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-400 text-white rounded-full flex items-center justify-center font-bold">
                      {child.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{child.name}</p>
                      <p className="text-sm text-gray-500">{child.grade || ''} {child.school || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Points:</span>
                    <span className="font-bold text-yellow-600">
                      {child.total_points}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
