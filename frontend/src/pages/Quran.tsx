import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { islamicApi, authApi } from '../services/api';
import { BookOpen, Check, Plus, Edit2 } from 'lucide-react';

export default function Quran() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: progress, isLoading } = useQuery({
    queryKey: ['quran-progress', selectedUser],
    queryFn: () => islamicApi.getQuranProgress(selectedUser!),
    enabled: !!selectedUser,
  });

  const { data: surahs } = useQuery({
    queryKey: ['surahs'],
    queryFn: islamicApi.getSurahs,
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
    enabled: user?.role === 'parent',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => islamicApi.updateQuranProgress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-progress'] });
    },
  });

  const memorizedCount = progress?.filter((p: any) => p.status === 'memorized').length || 0;
  const inProgressCount = progress?.filter((p: any) => p.status === 'in_progress').length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'memorized':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'needs_revision':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quran Memorization</h1>
        <div className="flex gap-2">
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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-islamic-green text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            <Plus size={20} />
            Add Surah
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{memorizedCount}</p>
          <p className="text-sm text-green-700">Memorized</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{inProgressCount}</p>
          <p className="text-sm text-yellow-700">In Progress</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">114</p>
          <p className="text-sm text-purple-700">Total Surahs</p>
        </div>
      </div>

      {/* Progress List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Your Progress</h2>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : progress?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No surahs tracked yet. Start by adding one!
            </div>
          ) : (
            <div className="space-y-3">
              {progress?.map((surah: any) => (
                <div
                  key={surah.id}
                  className={`border rounded-lg p-4 ${getStatusColor(surah.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold">
                        {surah.surah_number}
                      </div>
                      <div>
                        <h3 className="font-semibold">{surah.surah_name}</h3>
                        <p className="text-sm opacity-75">
                          {surah.verses_memorized} / {surah.total_verses} verses
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{surah.progress_percentage.toFixed(0)}%</p>
                      <p className="text-xs capitalize">{surah.status.replace('_', ' ')}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-current opacity-50"
                        style={{ width: `${surah.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        const newVerses = Math.min(surah.verses_memorized + 1, surah.total_verses);
                        updateMutation.mutate({
                          user_id: selectedUser,
                          surah_number: surah.surah_number,
                          surah_name: surah.surah_name,
                          total_verses: surah.total_verses,
                          verses_memorized: newVerses,
                          status: newVerses === surah.total_verses ? 'memorized' : 'in_progress',
                        });
                      }}
                      className="text-xs px-2 py-1 bg-white/50 rounded hover:bg-white/80"
                    >
                      +1 Verse
                    </button>
                    {surah.status !== 'memorized' && (
                      <button
                        onClick={() => {
                          updateMutation.mutate({
                            user_id: selectedUser,
                            surah_number: surah.surah_number,
                            surah_name: surah.surah_name,
                            total_verses: surah.total_verses,
                            verses_memorized: surah.total_verses,
                            status: 'memorized',
                          });
                        }}
                        className="text-xs px-2 py-1 bg-white/50 rounded hover:bg-white/80"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Surah Modal */}
      {showAddModal && (
        <AddSurahModal
          surahs={surahs || []}
          userId={selectedUser!}
          existingProgress={progress || []}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

function AddSurahModal({
  surahs,
  userId,
  existingProgress,
  onClose,
}: {
  surahs: any[];
  userId: number;
  existingProgress: any[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedSurah, setSelectedSurah] = useState<any>(null);

  const addMutation = useMutation({
    mutationFn: islamicApi.updateQuranProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quran-progress'] });
      onClose();
    },
  });

  const existingIds = new Set(existingProgress.map((p) => p.surah_number));
  const availableSurahs = surahs.filter((s) => !existingIds.has(s.number));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Add Surah to Track</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {availableSurahs.map((surah) => (
              <button
                key={surah.number}
                onClick={() => setSelectedSurah(surah)}
                className={`w-full p-3 rounded-lg border text-left transition ${
                  selectedSurah?.number === surah.number
                    ? 'border-islamic-green bg-islamic-light'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {surah.number}
                  </span>
                  <div>
                    <p className="font-medium">{surah.name}</p>
                    <p className="text-sm text-gray-500">{surah.verses} verses</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedSurah) {
                addMutation.mutate({
                  user_id: userId,
                  surah_number: selectedSurah.number,
                  surah_name: selectedSurah.name,
                  total_verses: selectedSurah.verses,
                  verses_memorized: 0,
                  status: 'not_started',
                });
              }
            }}
            disabled={!selectedSurah || addMutation.isPending}
            className="flex-1 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {addMutation.isPending ? 'Adding...' : 'Add Surah'}
          </button>
        </div>
      </div>
    </div>
  );
}
