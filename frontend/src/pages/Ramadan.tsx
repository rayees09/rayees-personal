import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { islamicApi, authApi, ramadanGoalsApi, zakatApi, qadhaApi } from '../services/api';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Moon, Sun, BookOpen, Heart, Plus, Target, Trash2, X, Coins, AlertCircle, Check, Calendar, Edit3 } from 'lucide-react';

export default function Ramadan() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showCharityModal, setShowCharityModal] = useState(false);
  const [showQadhaModal, setShowQadhaModal] = useState(false);
  const [charityAmount, setCharityAmount] = useState('');
  const [newGoal, setNewGoal] = useState({ title: '', target_value: 1, unit: 'times', goal_type: 'daily', description: '' });
  const [missedReason, setMissedReason] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [completingQadhaId, setCompletingQadhaId] = useState<number | null>(null);
  const [completionDate, setCompletionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [editingQadha, setEditingQadha] = useState<any | null>(null);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const { data: ramadanLog } = useQuery({
    queryKey: ['ramadan', selectedUser, selectedYear],
    queryFn: () => islamicApi.getRamadanLog(selectedUser!, selectedYear),
    enabled: !!selectedUser,
  });

  const { data: summary } = useQuery({
    queryKey: ['ramadan-summary', selectedUser, selectedYear],
    queryFn: () => islamicApi.getRamadanSummary(selectedUser!, selectedYear),
    enabled: !!selectedUser,
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const { data: goals } = useQuery({
    queryKey: ['ramadan-goals', selectedUser, selectedYear],
    queryFn: () => ramadanGoalsApi.getAll(selectedYear, selectedUser || undefined),
    enabled: !!selectedUser,
  });

  // Get Zakat config for selected year to link charity
  const { data: zakatConfigs } = useQuery({
    queryKey: ['zakat-configs', selectedYear],
    queryFn: () => zakatApi.getConfigs(selectedYear),
  });

  // Get Qadha records
  const { data: qadhaRecords } = useQuery({
    queryKey: ['qadha', selectedUser, selectedYear],
    queryFn: () => qadhaApi.getRecords(selectedUser!, selectedYear),
    enabled: !!selectedUser,
  });

  const { data: qadhaSummary } = useQuery({
    queryKey: ['qadha-summary', selectedUser],
    queryFn: () => qadhaApi.getSummary(selectedUser!),
    enabled: !!selectedUser,
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

  const addQadhaMutation = useMutation({
    mutationFn: qadhaApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qadha'] });
      queryClient.invalidateQueries({ queryKey: ['qadha-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-summary'] });
    },
  });

  const updateQadhaMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => qadhaApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qadha'] });
      queryClient.invalidateQueries({ queryKey: ['qadha-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-summary'] });
      setShowQadhaModal(false);
      setCompletingQadhaId(null);
      setEditingQadha(null);
    },
  });

  const deleteQadhaMutation = useMutation({
    mutationFn: qadhaApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qadha'] });
      queryClient.invalidateQueries({ queryKey: ['qadha-summary'] });
      queryClient.invalidateQueries({ queryKey: ['ramadan-summary'] });
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
      year: selectedYear,
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

  const handleFastingStatusChange = (status: string, reason?: string) => {
    const updateData = {
      user_id: selectedUser,
      date: dateStr,
      ...todayLog,
      fasting_status: status,
      fasted: status === 'fasted',
      missed_reason: reason || null,
    };

    logMutation.mutate(updateData, {
      onSuccess: () => {
        // If marking as missed, auto-create Qadha record
        if (status === 'missed' && reason) {
          addQadhaMutation.mutate({
            ramadan_year: selectedYear,
            original_date: dateStr,
            missed_reason: reason,
          });
        }
      },
    });
    setMissedReason('');
  };

  const handleMarkQadhaComplete = (qadhaId: number, date: string) => {
    updateQadhaMutation.mutate({
      id: qadhaId,
      data: {
        compensated_date: date,
        is_compensated: true,
      },
    });
  };

  const handleStartQadhaCompletion = (qadhaId: number) => {
    setCompletingQadhaId(qadhaId);
    setCompletionDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleConfirmQadhaCompletion = () => {
    if (completingQadhaId) {
      handleMarkQadhaComplete(completingQadhaId, completionDate);
    }
  };

  const handleEditQadha = (qadha: any) => {
    setEditingQadha({
      ...qadha,
      ramadan_year: qadha.ramadan_year,
      missed_reason: qadha.missed_reason || 'other',
      notes: qadha.notes || '',
    });
  };

  const handleSaveQadhaEdit = () => {
    if (!editingQadha) return;
    updateQadhaMutation.mutate({
      id: editingQadha.id,
      data: {
        ramadan_year: editingQadha.ramadan_year,
        missed_reason: editingQadha.missed_reason,
        notes: editingQadha.notes,
        is_compensated: editingQadha.is_compensated,
        compensated_date: editingQadha.compensated_date,
      },
    });
  };

  const handleDeleteQadha = (qadhaId: number) => {
    if (confirm('Are you sure you want to delete this qadha record?')) {
      deleteQadhaMutation.mutate(qadhaId);
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Ramadan {selectedYear}</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg bg-white"
          >
            {[2024, 2025, 2026, 2027, 2028].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {user?.role === 'parent' && family && (
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {family.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl p-4">
          <Moon size={24} className="mb-2" />
          <p className="text-2xl font-bold">{summary?.fasted_days || 0}</p>
          <p className="text-sm opacity-80">Fasting Days</p>
        </div>
        <div className="bg-gradient-to-br from-red-400 to-red-500 text-white rounded-xl p-4 relative">
          <AlertCircle size={24} className="mb-2" />
          <p className="text-2xl font-bold">{summary?.qadha_pending || 0}</p>
          <p className="text-sm opacity-80">Qadha Pending</p>
          {(summary?.qadha_completed || 0) > 0 && (
            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              {summary.qadha_completed} done
            </div>
          )}
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
          {/* Fasting Status */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Sun className="text-orange-500" size={24} />
              <div>
                <p className="font-medium">Fasting Status</p>
                <p className="text-sm text-gray-500">Track your fast for today</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleFastingStatusChange('fasted')}
                className={`py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition ${
                  (todayLog.fasting_status === 'fasted' || todayLog.fasting_status === 'not_tracked' || !todayLog.fasting_status)
                    ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Check size={16} /> Fasted
              </button>
              <button
                onClick={() => {
                  if (todayLog.fasting_status === 'missed') {
                    handleFastingStatusChange('fasted');
                  } else {
                    setMissedReason('selecting');
                  }
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition ${
                  todayLog.fasting_status === 'missed'
                    ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <X size={16} /> Missed
              </button>
              <button
                onClick={() => {
                  if (todayLog.fasting_status === 'exempt') {
                    handleFastingStatusChange('fasted');
                  } else {
                    handleFastingStatusChange('exempt');
                  }
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition ${
                  todayLog.fasting_status === 'exempt'
                    ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <AlertCircle size={16} /> Exempt
              </button>
            </div>

            {/* Missed Reason Selector - show when selecting missed or already marked as missed */}
            {(missedReason === 'selecting' || todayLog.fasting_status === 'missed') && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">Reason for missing:</p>
                <div className="flex flex-wrap gap-2">
                  {['illness', 'travel', 'menstruation', 'other'].map((reason) => (
                    <button
                      key={reason}
                      onClick={() => {
                        handleFastingStatusChange('missed', reason);
                        setMissedReason('');
                      }}
                      className={`px-3 py-1 rounded-full text-sm capitalize transition ${
                        todayLog.missed_reason === reason
                          ? 'bg-red-500 text-white'
                          : 'bg-white border border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                {missedReason === 'selecting' && (
                  <button
                    onClick={() => setMissedReason('')}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
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
                Zakat {selectedYear}: {zakatConfigs[0].currency} {zakatConfigs[0].total_paid?.toLocaleString()} / {zakatConfigs[0].total_due?.toLocaleString()} paid
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

      {/* Qadha (Missed Fasts) Tracking - Compact */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b bg-gradient-to-r from-red-500 to-orange-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={18} />
            <h2 className="font-semibold text-sm">Qadha - Missed Fasts</h2>
            {(qadhaSummary?.total_pending || 0) > 0 && (
              <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">
                {qadhaSummary.total_pending} pending
              </span>
            )}
          </div>
          <button
            onClick={() => setShowQadhaModal(true)}
            className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs flex items-center gap-1"
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <div className="p-3">
          {/* Pending Qadha - Compact List */}
          {qadhaRecords?.filter((q: any) => !q.is_compensated).length > 0 ? (
            <div className="space-y-2">
              {qadhaRecords?.filter((q: any) => !q.is_compensated).map((qadha: any) => (
                <div key={qadha.id} className="p-2 bg-red-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{qadha.ramadan_year}</span>
                      {qadha.original_date && (
                        <span className="text-gray-500 text-xs">
                          {format(new Date(qadha.original_date), 'MMM d')}
                        </span>
                      )}
                      <span className="text-gray-400 text-xs capitalize">({qadha.missed_reason || 'other'})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditQadha(qadha)}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteQadha(qadha.id)}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      {completingQadhaId === qadha.id ? (
                        <button
                          onClick={() => setCompletingQadhaId(null)}
                          className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartQadhaCompletion(qadha.id)}
                          className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Date picker for completion */}
                  {completingQadhaId === qadha.id && (
                    <div className="mt-2 flex items-center gap-2 pt-2 border-t border-red-100">
                      <label className="text-xs text-gray-600">Completed on:</label>
                      <input
                        type="date"
                        value={completionDate}
                        onChange={(e) => setCompletionDate(e.target.value)}
                        className="flex-1 px-2 py-1 border rounded text-xs"
                        max={format(new Date(), 'yyyy-MM-dd')}
                      />
                      <button
                        onClick={handleConfirmQadhaCompletion}
                        disabled={updateQadhaMutation.isPending}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                      >
                        {updateQadhaMutation.isPending ? '...' : 'Confirm'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-2">No pending qadha fasts</p>
          )}

          {/* Completed - Collapsed */}
          {qadhaRecords?.filter((q: any) => q.is_compensated).length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                {qadhaRecords.filter((q: any) => q.is_compensated).length} completed
              </summary>
              <div className="mt-1 space-y-1">
                {qadhaRecords?.filter((q: any) => q.is_compensated).map((qadha: any) => (
                  <div key={qadha.id} className="flex items-center justify-between text-xs text-green-600 py-1">
                    <div className="flex items-center gap-1">
                      <Check size={12} />
                      <span>
                        {qadha.ramadan_year}
                        {qadha.original_date && ` (missed ${format(new Date(qadha.original_date), 'MMM d')})`}
                        {' → done '}
                        {format(new Date(qadha.compensated_date), 'MMM d')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditQadha(qadha)}
                        className="p-0.5 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteQadha(qadha.id)}
                        className="p-0.5 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
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
                    <span>Zakat (counts toward {selectedYear} Zakat)</span>
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
                  To track Zakat payments, set up your Zakat for {selectedYear} in the Zakat page.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Qadha Modal */}
      {showQadhaModal && (
        <AddQadhaModal
          onClose={() => setShowQadhaModal(false)}
          onSuccess={() => {
            setShowQadhaModal(false);
            queryClient.invalidateQueries({ queryKey: ['qadha'] });
            queryClient.invalidateQueries({ queryKey: ['qadha-summary'] });
            queryClient.invalidateQueries({ queryKey: ['ramadan-summary'] });
          }}
        />
      )}

      {/* Edit Qadha Modal */}
      {editingQadha && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Edit Qadha Record</h3>
              <button onClick={() => setEditingQadha(null)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ramadan Year</label>
                <select
                  value={editingQadha.ramadan_year}
                  onChange={(e) => setEditingQadha({ ...editingQadha, ramadan_year: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>
                      Ramadan {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reason for Missing</label>
                <div className="flex flex-wrap gap-2">
                  {['illness', 'travel', 'menstruation', 'other'].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setEditingQadha({ ...editingQadha, missed_reason: reason })}
                      className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                        editingQadha.missed_reason === reason
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={editingQadha.notes || ''}
                  onChange={(e) => setEditingQadha({ ...editingQadha, notes: e.target.value })}
                  placeholder="Any additional notes"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {editingQadha.is_compensated && (
                <div>
                  <label className="block text-sm font-medium mb-1">Compensation Date</label>
                  <input
                    type="date"
                    value={editingQadha.compensated_date || ''}
                    onChange={(e) => setEditingQadha({ ...editingQadha, compensated_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCompensated"
                  checked={editingQadha.is_compensated}
                  onChange={(e) => setEditingQadha({
                    ...editingQadha,
                    is_compensated: e.target.checked,
                    compensated_date: e.target.checked ? (editingQadha.compensated_date || format(new Date(), 'yyyy-MM-dd')) : null
                  })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="isCompensated" className="text-sm">Mark as completed</label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingQadha(null)}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQadhaEdit}
                  disabled={updateQadhaMutation.isPending}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateQadhaMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
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

// Add Qadha Modal Component
function AddQadhaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [qadhaYear, setQadhaYear] = useState(new Date().getFullYear());
  const [qadhaReason, setQadhaReason] = useState('');
  const [qadhaCount, setQadhaCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!qadhaReason) {
      setError('Please select a reason');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Add multiple qadha records based on count
      for (let i = 0; i < qadhaCount; i++) {
        await qadhaApi.add({
          ramadan_year: qadhaYear,
          missed_reason: qadhaReason,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add qadha');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Add Missed Fast (Qadha)</h3>
          <button onClick={onClose} className="text-gray-500">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Ramadan Year</label>
            <select
              value={qadhaYear}
              onChange={(e) => setQadhaYear(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  Ramadan {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason for Missing</label>
            <div className="flex flex-wrap gap-2">
              {['illness', 'travel', 'menstruation', 'other'].map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setQadhaReason(reason)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                    qadhaReason === reason
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Number of Days</label>
            <input
              type="number"
              min="1"
              max="30"
              value={qadhaCount}
              onChange={(e) => setQadhaCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">How many days did you miss?</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !qadhaReason}
            className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Adding...' : `Add ${qadhaCount} Qadha Day${qadhaCount > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
