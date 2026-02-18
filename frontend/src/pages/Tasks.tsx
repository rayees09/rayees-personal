import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { tasksApi, authApi } from '../services/api';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { Plus, Check, Clock, X, GripVertical, Trash2, Edit2 } from 'lucide-react';

export default function Tasks() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [viewTab, setViewTab] = useState<'all' | 'today' | 'upcoming'>('today');
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [draggedTask, setDraggedTask] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Filter tasks by view tab
  const getFilteredTasks = () => {
    let filtered = tasks || [];

    // First filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((task: any) => task.status === filter);
    }

    // Then filter by view tab
    if (viewTab === 'today') {
      filtered = filtered.filter((task: any) => {
        if (!task.due_date) return true; // Tasks without due date show in today
        const dueDate = new Date(task.due_date);
        return isToday(dueDate) || isPast(dueDate);
      });
    } else if (viewTab === 'upcoming') {
      filtered = filtered.filter((task: any) => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return !isToday(dueDate) && !isPast(dueDate);
      });
    }

    // Sort by priority (pending first, then by due date)
    return filtered.sort((a: any, b: any) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      if (a.priority !== b.priority) return (b.priority || 0) - (a.priority || 0);
      return 0;
    });
  };

  const filteredTasks = getFilteredTasks();

  const categories = [
    { value: 'homework', label: 'Homework', color: 'bg-blue-100 text-blue-700' },
    { value: 'chore', label: 'Chore', color: 'bg-green-100 text-green-700' },
    { value: 'prayer', label: 'Prayer', color: 'bg-purple-100 text-purple-700' },
    { value: 'quran', label: 'Quran', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'exercise', label: 'Exercise', color: 'bg-red-100 text-red-700' },
    { value: 'office', label: 'Office', color: 'bg-indigo-100 text-indigo-700' },
    { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-700' },
  ];

  const getCategoryStyle = (category: string) => {
    return categories.find((c) => c.value === category)?.color || 'bg-gray-100 text-gray-700';
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: number) => {
    e.preventDefault();
    if (draggedTask === null || draggedTask === targetTaskId) return;

    // Find positions
    const taskList = [...filteredTasks];
    const draggedIndex = taskList.findIndex((t: any) => t.id === draggedTask);
    const targetIndex = taskList.findIndex((t: any) => t.id === targetTaskId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Update priority based on new position
      const newPriority = targetIndex < draggedIndex ? targetIndex + 1 : targetIndex;
      updateMutation.mutate({ id: draggedTask, data: { priority: 100 - newPriority } });
    }

    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const getDueDateLabel = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    if (isPast(date)) return 'Overdue';
    return format(date, 'MMM d');
  };

  const getDueDateColor = (dueDate: string) => {
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-red-600 font-medium';
    if (isToday(date)) return 'text-orange-600 font-medium';
    return 'text-gray-500';
  };

  // Count tasks for badges
  const todayCount = (tasks || []).filter((t: any) => {
    if (t.status !== 'pending') return false;
    if (!t.due_date) return true;
    const dueDate = new Date(t.due_date);
    return isToday(dueDate) || isPast(dueDate);
  }).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {user?.role === 'parent' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 bg-islamic-green text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition text-sm"
          >
            <Plus size={18} />
            Add
          </button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewTab('today')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
            viewTab === 'today'
              ? 'bg-white shadow text-islamic-green'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Today {todayCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{todayCount}</span>}
        </button>
        <button
          onClick={() => setViewTab('upcoming')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
            viewTab === 'upcoming'
              ? 'bg-white shadow text-islamic-green'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setViewTab('all')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
            viewTab === 'all'
              ? 'bg-white shadow text-islamic-green'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          All
        </button>
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status Filter */}
        <div className="flex gap-1">
          {['all', 'pending', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-2 py-0.5 rounded text-xs capitalize ${
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
            className="px-2 py-0.5 border rounded text-xs"
          >
            <option value="">All Members</option>
            {family.map((member: any) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tasks List - Compact */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b bg-gray-50">
          <h2 className="font-semibold text-sm text-gray-700">
            {viewTab === 'today' ? "Today's Tasks" : viewTab === 'upcoming' ? 'Upcoming Tasks' : 'All Tasks'}
          </h2>
        </div>

        <div className="divide-y">
          {isLoading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              {viewTab === 'today' ? 'No tasks for today!' : 'No tasks found.'}
            </div>
          ) : (
            filteredTasks.map((task: any) => (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, task.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition group ${
                  draggedTask === task.id ? 'opacity-50 bg-blue-50' : ''
                } ${task.status === 'completed' || task.status === 'verified' ? 'bg-gray-50' : ''}`}
              >
                {/* Drag Handle */}
                <div className="cursor-grab text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition">
                  <GripVertical size={14} />
                </div>

                {/* Checkbox */}
                <button
                  onClick={() => {
                    if (task.status === 'pending') {
                      completeMutation.mutate(task.id);
                    }
                  }}
                  disabled={task.status !== 'pending'}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    task.status === 'completed' || task.status === 'verified'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {(task.status === 'completed' || task.status === 'verified') && (
                    <Check size={12} />
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm truncate ${
                        task.status === 'completed' || task.status === 'verified'
                          ? 'line-through text-gray-400'
                          : 'text-gray-800'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${getCategoryStyle(task.category)}`}>
                    {task.category}
                  </span>
                  {task.priority && (
                    <span className={`px-1.5 py-0.5 rounded text-xs ${getPriorityStyle(task.priority)}`}>
                      {task.priority}
                    </span>
                  )}
                  {task.due_date && (
                    <span className={`flex items-center gap-0.5 text-xs ${getDueDateColor(task.due_date)}`}>
                      <Clock size={10} />
                      {getDueDateLabel(task.due_date)}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  {user?.role === 'parent' && (
                    <>
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1 text-gray-400 hover:text-blue-500"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this task?')) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          family={family || []}
          categories={categories}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          family={family || []}
          categories={categories}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

function CreateTaskModal({ family, categories, onClose }: { family: any[]; categories: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: '',
    points: 10,
    category: 'other',
    priority: 'medium',
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
        <div className="p-3 border-b flex items-center justify-between">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
                required
              >
                <option value="">Select</option>
                {family.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
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
            className="w-full bg-islamic-green text-white py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 text-sm"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditTaskModal({ task, family, categories, onClose }: { task: any; family: any[]; categories: any[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    assigned_to: task.assigned_to?.toString() || '',
    due_date: task.due_date ? format(new Date(task.due_date), "yyyy-MM-dd'T'HH:mm") : '',
    points: task.points || 10,
    category: task.category || 'other',
    priority: task.priority || 'medium',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => tasksApi.updateTask(task.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      assigned_to: Number(formData.assigned_to),
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-3 border-b flex items-center justify-between">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
                required
              >
                <option value="">Select</option>
                {family.map((member: any) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
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
            disabled={updateMutation.isPending}
            className="w-full bg-islamic-green text-white py-2 rounded-lg hover:bg-teal-700 transition disabled:opacity-50 text-sm"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
