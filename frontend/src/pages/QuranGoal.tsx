import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { quranGoalsApi, authApi } from '../services/api';
import { format } from 'date-fns';
import { BookOpen, Camera, Target, TrendingUp, Check, Plus, Calendar, Edit2, Trash2, X } from 'lucide-react';

export default function QuranGoal() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [manualPages, setManualPages] = useState('');
  const [editingLog, setEditingLog] = useState<any>(null);
  const [editLogPages, setEditLogPages] = useState('');

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const { data: goal, isLoading } = useQuery({
    queryKey: ['quran-goal', selectedUser],
    queryFn: () => quranGoalsApi.getActiveGoal(selectedUser || undefined),
    enabled: !!selectedUser,
  });

  const { data: stats } = useQuery({
    queryKey: ['quran-stats', selectedUser],
    queryFn: () => quranGoalsApi.getStats(selectedUser || undefined),
    enabled: !!goal && !!selectedUser,
  });

  const { data: logs } = useQuery({
    queryKey: ['quran-logs', selectedUser],
    queryFn: () => quranGoalsApi.getReadingLogs(selectedUser || undefined),
    enabled: !!goal && !!selectedUser,
  });

  const logMutation = useMutation({
    mutationFn: quranGoalsApi.logReading,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      queryClient.invalidateQueries({ queryKey: ['quran-stats'] });
      queryClient.invalidateQueries({ queryKey: ['quran-logs'] });
      setManualPages('');
    },
  });

  const imageMutation = useMutation({
    mutationFn: quranGoalsApi.logReadingFromImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      queryClient.invalidateQueries({ queryKey: ['quran-stats'] });
      queryClient.invalidateQueries({ queryKey: ['quran-logs'] });
    },
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ logId, pages }: { logId: number; pages: number }) =>
      quranGoalsApi.updateReadingLog(logId, pages),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      queryClient.invalidateQueries({ queryKey: ['quran-stats'] });
      queryClient.invalidateQueries({ queryKey: ['quran-logs'] });
      setEditingLog(null);
      setEditLogPages('');
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: quranGoalsApi.deleteReadingLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      queryClient.invalidateQueries({ queryKey: ['quran-stats'] });
      queryClient.invalidateQueries({ queryKey: ['quran-logs'] });
    },
  });

  const handleImageUpload = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    imageMutation.mutate(formData);
  };

  const handleManualLog = () => {
    if (!manualPages) return;
    const formData = new FormData();
    formData.append('pages_read', manualPages);
    logMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Get the name of the selected user for display

  if (!goal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Quran Completion Goal</h1>
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

        <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-8 text-white text-center">
          <BookOpen size={64} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Start Your Quran Journey</h2>
          <p className="text-green-100 mb-6">
            Set a goal to complete the Quran during Ramadan
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
          >
            Create Goal
          </button>
        </div>

        {showCreateModal && (
          <CreateGoalModal onClose={() => setShowCreateModal(false)} />
        )}
      </div>
    );
  }

  const progressPercent = goal.progress_percentage;
  const todayTarget = goal.pages_per_day;
  const todayRead = goal.pages_read_today;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quran Completion Goal</h1>
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

      {/* Edit Modal */}
      {showEditModal && goal && (
        <EditGoalModal goal={goal} onClose={() => setShowEditModal(false)} />
      )}

      {/* Progress Overview */}
      <div className="bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">{goal.title}</h2>
            <p className="text-green-100">
              {goal.target_days} days goal started {format(new Date(goal.start_date), 'MMM d')}
            </p>
          </div>
          <div className="flex items-start gap-4">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
              title="Edit Goal"
            >
              <Edit2 size={18} />
            </button>
            <div className="text-right">
              <p className="text-4xl font-bold">{progressPercent.toFixed(1)}%</p>
              <p className="text-green-100">Complete</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-4 bg-white/20 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{goal.current_page}</p>
            <p className="text-sm text-green-100">Pages Read</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{goal.total_pages - goal.current_page}</p>
            <p className="text-sm text-green-100">Remaining</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{goal.days_remaining}</p>
            <p className="text-sm text-green-100">Days Left</p>
          </div>
        </div>
      </div>

      {/* Today's Progress */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Target className="text-green-500" />
          Today's Target: {todayTarget} pages
        </h3>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                todayRead >= todayTarget ? 'bg-green-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${Math.min(100, (todayRead / todayTarget) * 100)}%` }}
            />
          </div>
          <span className="font-bold">
            {todayRead}/{todayTarget}
          </span>
        </div>

        {todayRead >= todayTarget ? (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
            <Check />
            <span>MashaAllah! You've reached today's target!</span>
          </div>
        ) : (
          <p className="text-gray-500">
            {todayTarget - todayRead} more pages to reach today's goal
          </p>
        )}
      </div>

      {/* Log Reading */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold text-lg mb-4">Log Your Reading</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upload Page Image */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-500 hover:bg-green-50 cursor-pointer transition"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
            />
            <Camera size={40} className="mx-auto text-gray-400 mb-2" />
            <p className="font-medium">Take Photo of Page</p>
            <p className="text-sm text-gray-500">AI will detect page number</p>
          </div>

          {/* Manual Entry */}
          <div className="border rounded-xl p-6">
            <p className="font-medium mb-3">Or enter manually</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={manualPages}
                onChange={(e) => setManualPages(e.target.value)}
                placeholder="Pages read"
                className="flex-1 px-3 py-2 border rounded-lg"
                min={1}
              />
              <button
                onClick={handleManualLog}
                disabled={!manualPages || logMutation.isPending}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {(logMutation.isPending || imageMutation.isPending) && (
          <div className="mt-4 text-center text-green-600">
            Logging your reading...
          </div>
        )}

        {imageMutation.data && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <p className="font-medium text-green-700">
              Logged {imageMutation.data.ai_detected?.pages_count || 1} page(s)
            </p>
            {imageMutation.data.ai_detected?.surah_name && (
              <p className="text-sm text-green-600">
                Surah: {imageMutation.data.ai_detected.surah_name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Indicator */}
      {stats && (
        <div className={`rounded-xl p-4 ${
          stats.tracking?.on_track
            ? 'bg-green-50 border border-green-200'
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-center gap-3">
            <TrendingUp className={stats.tracking?.on_track ? 'text-green-500' : 'text-yellow-500'} />
            <div>
              <p className="font-medium">
                {stats.tracking?.on_track ? 'You are on track!' : 'You are behind schedule'}
              </p>
              <p className="text-sm text-gray-600">
                {stats.tracking?.ahead_behind >= 0
                  ? `${stats.tracking.ahead_behind} pages ahead`
                  : `${Math.abs(stats.tracking.ahead_behind)} pages behind`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reading History */}
      {logs && logs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Reading History</h3>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
              >
                {editingLog?.id === log.id ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{format(new Date(log.date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={editLogPages}
                        onChange={(e) => setEditLogPages(e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-center"
                        min={1}
                        autoFocus
                      />
                      <button
                        onClick={() => updateLogMutation.mutate({ logId: log.id, pages: Number(editLogPages) })}
                        disabled={!editLogPages || updateLogMutation.isPending}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => { setEditingLog(null); setEditLogPages(''); }}
                        className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-gray-400" />
                      <span>{format(new Date(log.date), 'MMM d, yyyy')}</span>
                      {log.surah_name && (
                        <span className="text-sm text-gray-500">({log.surah_name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-600">+{log.pages_read} pages</span>
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={() => { setEditingLog(log); setEditLogPages(log.pages_read.toString()); }}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this entry?')) {
                              deleteLogMutation.mutate(log.id);
                            }
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateGoalModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [targetDays, setTargetDays] = useState(25);
  const [totalPages, setTotalPages] = useState(604);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const createMutation = useMutation({
    mutationFn: quranGoalsApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      onClose();
    },
  });

  const pagesPerDay = Math.ceil(totalPages / targetDays);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Create Quran Reading Goal</h2>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target Pages</label>
            <select
              value={totalPages}
              onChange={(e) => setTotalPages(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value={604}>Full Quran (604 pages)</option>
              <option value={300}>300 pages</option>
              <option value={200}>200 pages</option>
              <option value={100}>100 pages</option>
              <option value={60}>60 pages (2 juz)</option>
              <option value={30}>30 pages (1 juz)</option>
            </select>
            <input
              type="number"
              value={totalPages}
              onChange={(e) => setTotalPages(Number(e.target.value))}
              placeholder="Or enter custom pages"
              className="w-full px-3 py-2 border rounded-lg mt-2"
              min={1}
              max={604}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Complete in (days)</label>
            <input
              type="number"
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg"
              min={1}
              max={365}
            />
            <p className="text-sm text-gray-500 mt-1">
              = {pagesPerDay} pages per day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Goal:</strong> Read {totalPages} pages in {targetDays} days
              <br />
              <strong>Daily target:</strong> {pagesPerDay} pages/day
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                createMutation.mutate({
                  title: `Read ${totalPages} pages in ${targetDays} days`,
                  target_days: targetDays,
                  start_date: startDate,
                  total_pages: totalPages,
                });
              }}
              disabled={createMutation.isPending}
              className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Start Goal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditGoalModal({ goal, onClose }: { goal: any; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [targetDays, setTargetDays] = useState(goal.target_days);
  const [startDate, setStartDate] = useState(format(new Date(goal.start_date), 'yyyy-MM-dd'));
  const [currentPage, setCurrentPage] = useState(goal.current_page);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const totalPages = goal.total_pages || 604;

  const updateMutation = useMutation({
    mutationFn: () => quranGoalsApi.updateGoal(goal.id, {
      title: `Read ${totalPages} pages in ${targetDays} days`,
      target_days: targetDays,
      start_date: startDate,
      current_page: currentPage,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      queryClient.invalidateQueries({ queryKey: ['quran-stats'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => quranGoalsApi.deleteGoal(goal.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-goal'] });
      queryClient.invalidateQueries({ queryKey: ['quran-stats'] });
      queryClient.invalidateQueries({ queryKey: ['quran-logs'] });
      onClose();
    },
  });

  const pagesPerDay = Math.ceil(totalPages / targetDays);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Quran Goal</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {showDeleteConfirm ? (
          <div className="p-6 space-y-4">
            <div className="text-center">
              <Trash2 size={48} className="mx-auto text-red-500 mb-3" />
              <h3 className="text-lg font-semibold">Delete Goal?</h3>
              <p className="text-gray-500 mt-2">
                This will delete your goal and all reading history. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Complete in (days)</label>
              <input
                type="number"
                value={targetDays}
                onChange={(e) => setTargetDays(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
                min={1}
                max={60}
              />
              <p className="text-sm text-gray-500 mt-1">
                = {pagesPerDay} pages per day
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Current Page (0-{totalPages})</label>
              <input
                type="number"
                value={currentPage}
                onChange={(e) => setCurrentPage(Math.min(totalPages, Math.max(0, Number(e.target.value))))}
                className="w-full px-3 py-2 border rounded-lg"
                min={0}
                max={totalPages}
              />
              <p className="text-sm text-gray-500 mt-1">
                Set this if you need to adjust your progress
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Progress:</strong> {currentPage} / {totalPages} pages ({((currentPage / totalPages) * 100).toFixed(1)}%)
                <br />
                <strong>Remaining:</strong> {totalPages - currentPage} pages
                <br />
                <strong>Daily Target:</strong> {pagesPerDay} pages/day
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                title="Delete Goal"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
