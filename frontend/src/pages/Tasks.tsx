import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { tasksApi, authApi } from '../services/api';
import { format } from 'date-fns';
import { Plus, Check, Clock, X } from 'lucide-react';

export default function Tasks() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', selectedUser],
    queryFn: () => tasksApi.getTasks(selectedUser ? { assigned_to: selectedUser } : {}),
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
  });

  const completeMutation = useMutation({
    mutationFn: tasksApi.completeTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const filteredTasks = tasks?.filter((task: any) => {
    if (filter === 'all') return true;
    return task.status === filter;
  }) || [];

  const categories = [
    { value: 'homework', label: 'Homework', color: 'bg-blue-100 text-blue-700' },
    { value: 'chore', label: 'Chore', color: 'bg-green-100 text-green-700' },
    { value: 'prayer', label: 'Prayer', color: 'bg-purple-100 text-purple-700' },
    { value: 'quran', label: 'Quran', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'exercise', label: 'Exercise', color: 'bg-red-100 text-red-700' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
  ];

  const getCategoryStyle = (category: string) => {
    return categories.find((c) => c.value === category)?.color || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {user?.role === 'parent' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-islamic-green text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition"
          >
            <Plus size={20} />
            Add Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Status Filter */}
        <div className="flex gap-2">
          {['all', 'pending', 'completed', 'verified'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm capitalize ${
                filter === status
                  ? 'bg-islamic-green text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* User Filter (for parents) */}
        {user?.role === 'parent' && family && (
          <select
            value={selectedUser || ''}
            onChange={(e) => setSelectedUser(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-1 border rounded-lg text-sm"
          >
            <option value="">All Family Members</option>
            {family.map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tasks found. {user?.role === 'parent' && 'Create one to get started!'}
          </div>
        ) : (
          filteredTasks.map((task: any) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${
                task.status === 'completed' || task.status === 'verified'
                  ? 'border-green-500'
                  : task.status === 'in_progress'
                  ? 'border-yellow-500'
                  : 'border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => {
                    if (task.status === 'pending') {
                      completeMutation.mutate(task.id);
                    }
                  }}
                  disabled={task.status !== 'pending'}
                  className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    task.status === 'completed' || task.status === 'verified'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {(task.status === 'completed' || task.status === 'verified') && (
                    <Check size={14} />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3
                        className={`font-medium ${
                          task.status === 'completed' || task.status === 'verified'
                            ? 'line-through text-gray-400'
                            : ''
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                      )}
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-sm font-medium">
                      +{task.points} pts
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className={`px-2 py-0.5 rounded text-xs ${getCategoryStyle(task.category)}`}>
                      {task.category}
                    </span>
                    {task.assignee_name && (
                      <span className="text-xs text-gray-500">
                        Assigned to: {task.assignee_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        {format(new Date(task.due_date), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          family={family || []}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function CreateTaskModal({ family, onClose }: { family: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    points: 10,
    category: 'other',
  });

  const createMutation = useMutation({
    mutationFn: tasksApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      assigned_to: Number(formData.assigned_to),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Assign To</label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            >
              <option value="">Select person</option>
              {family.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="homework">Homework</option>
                <option value="chore">Chore</option>
                <option value="prayer">Prayer</option>
                <option value="quran">Quran</option>
                <option value="exercise">Exercise</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Points</label>
              <input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-islamic-green text-white py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}
