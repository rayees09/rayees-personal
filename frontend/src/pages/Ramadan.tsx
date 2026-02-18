import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { islamicApi, authApi, ramadanGoalsApi, zakatApi } from '../services/api';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Moon, Sun, BookOpen, Heart, Plus, Target, Trash2, X, Coins } from 'lucide-react';

export default function Ramadan() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [charityAmount, setCharityAmount] = useState('');
  const [newGoal, setNewGoal] = useState({ title: '', target_value: 1, unit: 'times', goal_type: 'daily', description: '' });
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const currentYear = new Date().getFullYear();

  const { data: ramadanLog } = useQuery({
    queryKey: ['ramadan', selectedUser, currentYear],
    queryFn: () => islamicApi.getRamadanLog(selectedUser!, currentYear),
    enabled: !!selectedUser,
  });

  const { data: summary } = useQuery({
    queryKey: ['ramadan-summary', selectedUser],
    queryFn: () => islamicApi.getRamadanSummary(selectedUser!, currentYear),
    enabled: !!selectedUser,
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const { data: goals } = useQuery({
    queryKey: ['ramadan-goals', selectedUser, currentYear],
    queryFn: () => ramadanGoalsApi.getAll(currentYear, selectedUser || undefined),
    enabled: !!selectedUser,
  });

  // Get Zakat config for current year to link charity
  const { data: zakatConfigs } = useQuery({
    queryKey: ['zakat-configs', currentYear],
    queryFn: () => zakatApi.getConfigs(currentYear),
  });

  const logMutation = useMutation({
    mutationFn: islamicApi.logRamadanDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-summary'] });
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: ramadanGoalsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-goals'] });
      setShowAddGoal(false);
      setNewGoal({ title: '', target_value: 1, unit: 'times', goal_type: 'daily', description: '' });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: ramadanGoalsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-goals'] });
    },
  });

  const logGoalMutation = useMutation({
    mutationFn: ramadanGoalsApi.logProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ramadan-goals'] });
    },
  });

  const zakatPaymentMutation = useMutation({
    mutationFn: zakatApi.addPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakat'] });
      queryClient.invalidateQueries({ queryKey: ['zakat-configs'] });
    },
  });

  const todayLog = ramadanLog?.find((d: any) => d.date === dateStr) || {};
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  const toggleField = (field: string, currentValue: boolean) => {
    logMutation.mutate({
      user_id: selectedUser,
      date: dateStr,
      ...todayLog,
      [field]: !currentValue,
    });
  };

  const updateQuranPages = (pages: number) => {
    logMutation.mutate({
      user_id: selectedUser,
      date: dateStr,
      ...todayLog,
      quran_pages: pages,
    });
  };

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return;
    createGoalMutation.mutate({
      year: currentYear,
      title: newGoal.title,
      description: newGoal.description || undefined,
      target_value: newGoal.target_value,
      unit: newGoal.unit,
      goal_type: newGoal.goal_type,
    });
  };

  const handleLogGoal = (goalId: number, currentValue: number) => {
    logGoalMutation.mutate({
      goal_id: goalId,
      date: dateStr,
      value: currentValue + 1,
    });
  };

  const handleCharityClick = () => {
    if (todayLog.charity_given) {
      // If already marked, just toggle off
      toggleField('charity_given', true);
    } else {
      // Show modal to choose Zakat or Sadaqah
      setShowCharityModal(true);
      setCharityAmount('');
    }
  };

  const handleCharitySubmit = (type: 'zakat' | 'sadaqah') => {
    // Mark charity given in Ramadan log
    logMutation.mutate({
      user_id: selectedUser,
      date: dateStr,
      ...todayLog,
      charity_given: true,
    });

    // If Zakat and we have a config for this year, also log to Zakat
    if (type === 'zakat' && zakatConfigs?.length > 0 && charityAmount) {
      const config = zakatConfigs[0]; // Use first config for this year
      zakatPaymentMutation.mutate({
        config_id: config.id,
        date: dateStr,
        amount: parseInt(charityAmount) || 0,
        recipient: 'Ramadan Charity',
        notes: `Logged from Ramadan tracker on ${dateStr}`,
      });
    }

    setShowCharityModal(false);
    setCharityAmount('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ramadan {currentYear}</h1>
        {user?.role === 'parent' && family && (
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {family.map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl p-4">
          <Moon size={24} className="mb-2" />
          <p className="text-2xl font-bold">{summary?.fasted_days || 0}</p>
          <p className="text-sm opacity-80">Fasting Days</p>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-500 text-white rounded-xl p-4">
          <Moon size={24} className="mb-2" />
          <p className="text-2xl font-bold">{summary?.taraweeh_days || 0}</p>
          <p className="text-sm opacity-80">Taraweeh Nights</p>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-500 text-white rounded-xl p-4">
          <BookOpen size={24} className="mb-2" />
          <p className="text-2xl font-bold">{summary?.total_quran_pages || 0}</p>
          <p className="text-sm opacity-80">Quran Pages</p>
        </div>
        <div className="bg-gradient-to-br from-pink-400 to-pink-500 text-white rounded-xl p-4">
          <Heart size={24} className="mb-2" />
          <p className="text-2xl font-bold">{summary?.charity_days || 0}</p>
          <p className="text-sm opacity-80">Charity Days</p>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {isToday ? 'Today' : format(selectedDate, 'EEEE')}
            </p>
            <p className="text-sm text-gray-500">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
            disabled={isToday}
          >
            <ChevronRight size={24} className={isToday ? 'text-gray-300' : ''} />
          </button>
        </div>
      </div>

      {/* Daily Tracking */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-islamic-green to-teal-600 text-white">
          <h2 className="font-semibold">Daily Tracking</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* Fasting */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Sun className="text-orange-500" size={24} />
              <div>
                <p className="font-medium">Fasting</p>
                <p className="text-sm text-gray-500">Completed today's fast</p>
              </div>
            </div>
            <button
              onClick={() => toggleField('fasted', todayLog.fasted)}
              className={`w-12 h-7 rounded-full transition ${
                todayLog.fasted ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                  todayLog.fasted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Taraweeh */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Moon className="text-indigo-500" size={24} />
              <div>
                <p className="font-medium">Taraweeh</p>
                <p className="text-sm text-gray-500">Night prayers</p>
              </div>
            </div>
            <button
              onClick={() => toggleField('taraweeh', todayLog.taraweeh)}
              className={`w-12 h-7 rounded-full transition ${
                todayLog.taraweeh ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                  todayLog.taraweeh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Quran Pages */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="text-green-500" size={24} />
              <div>
                <p className="font-medium">Quran Reading</p>
                <p className="text-sm text-gray-500">Pages read today</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 5, 10, 20].map((pages) => (
                <button
                  key={pages}
                  onClick={() => updateQuranPages((todayLog.quran_pages || 0) + pages)}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  +{pages}
                </button>
              ))}
              <span className="ml-auto font-bold text-lg">
                {todayLog.quran_pages || 0} pages
              </span>
            </div>
          </div>

          {/* Charity */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="text-pink-500" size={24} />
                <div>
                  <p className="font-medium">Charity</p>
                  <p className="text-sm text-gray-500">Zakat or Sadaqah</p>
                </div>
              </div>
              <button
                onClick={handleCharityClick}
                className={`w-12 h-7 rounded-full transition ${
                  todayLog.charity_given ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition ${
                    todayLog.charity_given ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {zakatConfigs?.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <Coins size={12} />
                Zakat {currentYear}: {zakatConfigs[0].currency} {zakatConfigs[0].total_paid?.toLocaleString()} / {zakatConfigs[0].total_due?.toLocaleString()} paid
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Goals */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={20} />
            <h2 className="font-semibold">My Ramadan Goals</h2>
          </div>
          <button
            onClick={() => setShowAddGoal(true)}
            className="p-1 hover:bg-white/20 rounded-lg transition"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {goals?.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No goals yet. Add your first Ramadan goal!
            </p>
          )}

          {goals?.map((goal: any) => (
            <div key={goal.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-sm text-gray-500">{goal.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteGoalMutation.mutate(goal.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-purple-600 font-bold text-lg">{goal.total_completed}</p>
                  <p className="text-purple-500 text-xs">{goal.unit} total</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-blue-600 font-bold text-lg">{goal.days_logged}</p>
                  <p className="text-blue-500 text-xs">days logged</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {goal.goal_type === 'daily' ? (
                    <span>Target: {goal.target_value} {goal.unit}/day</span>
                  ) : (
                    <span>Total Target: {goal.target_value} {goal.unit}</span>
                  )}
                </div>
                {/* Only show +1 button when viewing Today */}
                {isToday && (
                  <button
                    onClick={() => handleLogGoal(goal.id, 0)}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm font-medium"
                  >
                    + Log Today
                  </button>
                )}
              </div>

              {/* Progress bar for total goals */}
              {goal.goal_type === 'total' && (
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all"
                      style={{ width: `${Math.min(100, (goal.total_completed / goal.target_value) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {Math.round((goal.total_completed / goal.target_value) * 100)}%
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Charity Type Modal */}
      {showCharityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Log Charity</h3>
              <button onClick={() => setShowCharityModal(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">What type of charity did you give?</p>

              {zakatConfigs?.length > 0 && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount (optional for Zakat)</label>
                    <input
                      type="number"
                      value={charityAmount}
                      onChange={(e) => setCharityAmount(e.target.value)}
                      placeholder={`Amount in ${zakatConfigs[0].currency}`}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <button
                    onClick={() => handleCharitySubmit('zakat')}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 flex items-center justify-center gap-2"
                  >
                    <Coins size={20} />
                    <span>Zakat (counts toward {currentYear} Zakat)</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => handleCharitySubmit('sadaqah')}
                className="w-full py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 flex items-center justify-center gap-2"
              >
                <Heart size={20} />
                <span>Sadaqah (voluntary charity)</span>
              </button>

              {!zakatConfigs?.length && (
                <p className="text-xs text-gray-500 text-center">
                  To track Zakat payments, set up your Zakat for {currentYear} in the Zakat page.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Add Ramadan Goal</h3>
              <button onClick={() => setShowAddGoal(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Goal Title</label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="e.g., Read Quran, Give Charity, Extra Prayers"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  placeholder="More details about your goal"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Value</label>
                  <input
                    type="number"
                    min="1"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <select
                    value={newGoal.unit}
                    onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="times">times</option>
                    <option value="pages">pages</option>
                    <option value="minutes">minutes</option>
                    <option value="rakaat">rakaat</option>
                    <option value="juz">juz</option>
                    <option value="amount">amount</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Goal Type</label>
                <select
                  value={newGoal.goal_type}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="daily">Daily (track daily progress)</option>
                  <option value="total">Total (track overall progress)</option>
                </select>
              </div>
              <button
                onClick={handleAddGoal}
                disabled={!newGoal.title.trim() || createGoalMutation.isPending}
                className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {createGoalMutation.isPending ? 'Adding...' : 'Add Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
