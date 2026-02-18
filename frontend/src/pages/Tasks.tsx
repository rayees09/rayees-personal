import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { tasksApi, authApi } from '../services/api';
import { format } from 'date-fns';
import { Plus, Clock, X, Eye, CheckCircle, Edit2, Trash2, Check } from 'lucide-react';

export default function Tasks() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewingTask, setViewingTask] = useState<any>(null);
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

  const deleteMutation = useMutation({
    mutationFn: tasksApi.deleteTask,
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Family Tasks</h1>
        {user?.role === 'parent' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-islamic-green text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 text-sm"
          >
            <Plus size={18} />
            Add Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
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
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-3 py-2 border-b">
          <h2 className="font-semibold text-sm">
            {filter === 'all' ? 'All Tasks' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Tasks`}
          </h2>
        </div>

        <div className="p-3 space-y-3">
          {isLoading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No tasks found. {user?.role === 'parent' && 'Create one to get started!'}
            </div>
          ) : (
            filteredTasks.map((task: any) => {
              // Check if assignee is a child (only show points for kids)
              const assignee = family?.find((m: any) => m.id === task.assigned_to);
              const isChildTask = assignee?.role === 'child';
              const isCompleted = task.status === 'completed' || task.status === 'verified';

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${
                    isCompleted
                      ? 'border-green-500'
                      : task.status === 'in_progress'
                      ? 'border-yellow-500'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {isCompleted && <Check size={12} />}
                    </div>

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          className={`font-medium truncate text-sm ${
                            isCompleted ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {task.title}
                        </h3>
                        {isChildTask && task.points > 0 && (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0">
                            +{task.points} pts
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${getCategoryStyle(task.category)}`}>
                          {task.category}
                        </span>
                        {task.assignee_name && (
                          <span className="text-xs text-gray-500">
                            {task.assignee_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={10} />
                            {format(new Date(task.due_date), 'MMM d, h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* View Details */}
                      <button
                        onClick={() => setViewingTask(task)}
                        className="p-1.5 bg-blue-50 text-blue-400 hover:bg-blue-100 hover:text-blue-600 rounded"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {/* Mark Complete */}
                      {!isCompleted && (
                        <button
                          onClick={() => {
                            if (confirm(`Mark "${task.title}" as done?`)) {
                              completeMutation.mutate(task.id);
                            }
                          }}
                          className="p-1.5 bg-green-50 text-green-400 hover:bg-green-100 hover:text-green-600 rounded"
                          title="Mark as Done"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {/* Edit */}
                      {user?.role === 'parent' && (
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1.5 bg-purple-50 text-purple-400 hover:bg-purple-100 hover:text-purple-600 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {/* Delete */}
                      {user?.role === 'parent' && (
                        <button
                          onClick={() => {
                            if (confirm('Delete this task?')) {
                              deleteMutation.mutate(task.id);
                            }
                          }}
                          className="p-1.5 bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          family={family || []}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          family={family || []}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* View Task Modal */}
      {viewingTask && (
        <ViewTaskModal
          task={viewingTask}
          family={family || []}
          onClose={() => setViewingTask(null)}
          onEdit={() => {
            setViewingTask(null);
            setEditingTask(viewingTask);
          }}
          onComplete={() => {
            if (confirm(`Mark "${viewingTask.title}" as done?`)) {
              completeMutation.mutate(viewingTask.id);
              setViewingTask(null);
            }
          }}
          isParent={user?.role === 'parent'}
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

  // Check if selected assignee is a child
  const selectedAssignee = family.find((m) => m.id === Number(formData.assigned_to));
  const isChildAssignee = selectedAssignee?.role === 'child';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      assigned_to: Number(formData.assigned_to),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      points: isChildAssignee ? formData.points : 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Create Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Assign To</label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              required
            >
              <option value="">Select person</option>
              {family.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.role === 'child' ? '(Kid)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={isChildAssignee ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="homework">Homework</option>
                <option value="chore">Chore</option>
                <option value="prayer">Prayer</option>
                <option value="quran">Quran</option>
                <option value="exercise">Exercise</option>
                <option value="other">Other</option>
              </select>
            </div>

            {isChildAssignee && (
              <div>
                <label className="block text-xs font-medium mb-1">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  min={1}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditTaskModal({ task, family, onClose }: { task: any; family: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    assigned_to: String(task.assigned_to) || '',
    due_date: task.due_date ? task.due_date.slice(0, 16) : '',
    points: task.points || 10,
    category: task.category || 'other',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => tasksApi.updateTask(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const selectedAssignee = family.find((m) => m.id === Number(formData.assigned_to));
  const isChildAssignee = selectedAssignee?.role === 'child';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      assigned_to: Number(formData.assigned_to),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
      points: isChildAssignee ? formData.points : 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Edit Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Assign To</label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              required
            >
              <option value="">Select person</option>
              {family.map((member: any) => (
                <option key={member.id} value={member.id}>
                  {member.name} {member.role === 'child' ? '(Kid)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={isChildAssignee ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="homework">Homework</option>
                <option value="chore">Chore</option>
                <option value="prayer">Prayer</option>
                <option value="quran">Quran</option>
                <option value="exercise">Exercise</option>
                <option value="other">Other</option>
              </select>
            </div>

            {isChildAssignee && (
              <div>
                <label className="block text-xs font-medium mb-1">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  min={1}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 border rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-1.5 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewTaskModal({
  task,
  family,
  onClose,
  onEdit,
  onComplete,
  isParent,
}: {
  task: any;
  family: any[];
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
  isParent: boolean;
}) {
  const categories = [
    { value: 'homework', label: 'Homework', color: 'bg-blue-100 text-blue-700' },
    { value: 'chore', label: 'Chore', color: 'bg-green-100 text-green-700' },
    { value: 'prayer', label: 'Prayer', color: 'bg-purple-100 text-purple-700' },
    { value: 'quran', label: 'Quran', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'exercise', label: 'Exercise', color: 'bg-red-100 text-red-700' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
  ];

  const cat = categories.find((c) => c.value === task.category);
  const assignee = family.find((m) => m.id === task.assigned_to);
  const isChildTask = assignee?.role === 'child';
  const isCompleted = task.status === 'completed' || task.status === 'verified';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Task Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Title */}
          <h3 className={`font-semibold ${isCompleted ? 'line-through text-gray-400' : ''}`}>
            {task.title}
          </h3>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-gray-600">{task.description}</p>
          )}

          {/* Status & Category */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded text-xs ${cat?.color}`}>
              {cat?.label}
            </span>
            <span className={`px-2 py-1 rounded text-xs ${
              isCompleted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {task.status}
            </span>
            {isChildTask && task.points > 0 && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                +{task.points} pts
              </span>
            )}
          </div>

          {/* Assignee */}
          {task.assignee_name && (
            <p className="text-sm text-gray-600">
              Assigned to: <span className="font-medium">{task.assignee_name}</span>
            </p>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Clock size={14} />
              <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy h:mm a')}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isParent && (
              <button
                onClick={onEdit}
                className="flex-1 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 flex items-center justify-center gap-1.5 text-sm"
              >
                <Edit2 size={14} />
                Edit
              </button>
            )}
            {!isCompleted && (
              <button
                onClick={onComplete}
                className="flex-1 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center gap-1.5 text-sm"
              >
                <CheckCircle size={14} />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
