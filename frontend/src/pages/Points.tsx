import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { tasksApi, authApi } from '../services/api';
import { Star, Gift, Trophy, TrendingUp, Plus, X } from 'lucide-react';

export default function Points() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<number | null>(user?.id || null);
  const [showAddRewardModal, setShowAddRewardModal] = useState(false);

  const { data: points } = useQuery({
    queryKey: ['points', selectedUser],
    queryFn: () => tasksApi.getPoints(selectedUser!),
    enabled: !!selectedUser,
  });

  const { data: rewards } = useQuery({
    queryKey: ['rewards'],
    queryFn: tasksApi.getRewards,
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
  });

  const redeemMutation = useMutation({
    mutationFn: tasksApi.redeemReward,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points'] });
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
    },
  });

  const children = family?.filter((m: any) => m.role === 'child') || [];
  const currentPoints = points?.total_points || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Points & Rewards</h1>
        {user?.role === 'parent' && (
          <button
            onClick={() => setShowAddRewardModal(true)}
            className="flex items-center gap-2 bg-islamic-green text-white px-4 py-2 rounded-lg hover:bg-teal-700"
          >
            <Plus size={20} />
            Add Reward
          </button>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Trophy size={28} />
          <h2 className="text-xl font-bold">Family Leaderboard</h2>
        </div>

        <div className="space-y-3">
          {children
            .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
            .map((child: any, index: number) => (
              <div
                key={child.id}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  index === 0 ? 'bg-white/20' : 'bg-white/10'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0
                      ? 'bg-yellow-300 text-yellow-800'
                      : index === 1
                      ? 'bg-gray-300 text-gray-700'
                      : index === 2
                      ? 'bg-orange-300 text-orange-800'
                      : 'bg-white/30'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{child.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={16} fill="currentColor" />
                  <span className="font-bold">{child.total_points || 0}</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* User Selection (for parents viewing child) */}
      {user?.role === 'parent' && (
        <div className="flex gap-2">
          {children.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedUser(child.id)}
              className={`px-4 py-2 rounded-lg transition ${
                selectedUser === child.id
                  ? 'bg-islamic-green text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {/* Points Balance */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500">Current Balance</p>
            <p className="text-4xl font-bold text-islamic-green flex items-center gap-2">
              <Star className="text-yellow-500" fill="currentColor" />
              {currentPoints}
            </p>
          </div>
          <TrendingUp size={48} className="text-green-500" />
        </div>

        {/* Recent Points */}
        {points?.recent_points?.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium mb-2">Recent Activity</h3>
            <div className="space-y-2">
              {points.recent_points.slice(0, 5).map((entry: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{entry.reason}</span>
                  <span
                    className={`font-medium ${
                      entry.points > 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {entry.points > 0 ? '+' : ''}
                    {entry.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rewards Shop */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <Gift className="text-pink-500" />
          <h2 className="font-semibold text-lg">Rewards Shop</h2>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards?.length === 0 ? (
            <p className="text-gray-500 col-span-2 text-center py-4">
              No rewards available yet.
              {user?.role === 'parent' && ' Add some rewards for the kids!'}
            </p>
          ) : (
            rewards?.map((reward: any) => {
              const canAfford = currentPoints >= reward.points_required;
              return (
                <div
                  key={reward.id}
                  className={`border rounded-xl p-4 ${
                    canAfford ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-pink-100 rounded-xl flex items-center justify-center">
                      <Gift size={32} className="text-pink-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{reward.name}</h3>
                      {reward.description && (
                        <p className="text-sm text-gray-500">{reward.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <Star size={16} className="text-yellow-500" fill="currentColor" />
                        <span className="font-bold">{reward.points_required}</span>
                        <span className="text-gray-500">points</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => redeemMutation.mutate(reward.id)}
                    disabled={!canAfford || redeemMutation.isPending}
                    className={`w-full mt-4 py-2 rounded-lg font-medium transition ${
                      canAfford
                        ? 'bg-islamic-green text-white hover:bg-teal-700'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Redeem Reward' : `Need ${reward.points_required - currentPoints} more`}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Reward Modal */}
      {showAddRewardModal && (
        <AddRewardModal onClose={() => setShowAddRewardModal(false)} />
      )}
    </div>
  );
}

function AddRewardModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    points_required: 100,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/tasks/rewards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add New Reward</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(formData);
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Reward Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="e.g., Extra Screen Time"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="What does this reward include?"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Points Required</label>
            <input
              type="number"
              value={formData.points_required}
              onChange={(e) =>
                setFormData({ ...formData, points_required: Number(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-lg"
              min={1}
              required
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-islamic-green text-white py-2 rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Reward'}
          </button>
        </form>
      </div>
    </div>
  );
}
