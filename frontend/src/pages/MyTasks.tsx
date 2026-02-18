import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickTasksApi } from '../services/api';
import { format } from 'date-fns';
import { Plus, Briefcase, User, Heart, DollarSign, Users, X, Clock, Edit2, Trash2, Eye, CheckCircle, Sun, ChevronUp, ChevronDown } from 'lucide-react';

const CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: User, color: 'bg-blue-100 text-blue-700' },
  { id: 'office', label: 'Office', icon: Briefcase, color: 'bg-purple-100 text-purple-700' },
  { id: 'family', label: 'Family', icon: Users, color: 'bg-green-100 text-green-700' },
  { id: 'health', label: 'Health', icon: Heart, color: 'bg-red-100 text-red-700' },
  { id: 'finance', label: 'Finance', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { id: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-600' },
  { id: 'high', label: 'High', color: 'bg-orange-100 text-orange-600' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-600' },
];

export default function MyTasks() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewingTask, setViewingTask] = useState<any>(null);
  const [quickAdd, setQuickAdd] = useState('');
  const [quickCategory, setQuickCategory] = useState('personal');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['quick-tasks', selectedCategory],
    queryFn: () => quickTasksApi.getAll(selectedCategory || undefined),
  });

  const { data: byCategory } = useQuery({
    queryKey: ['quick-tasks-by-category'],
    queryFn: quickTasksApi.getByCategory,
  });

  const createMutation = useMutation({
    mutationFn: quickTasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks-by-category'] });
      setQuickAdd('');
    },
  });

  const completeMutation = useMutation({
    mutationFn: quickTasksApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks-by-category'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => quickTasksApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks-by-category'] });
      setEditingTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: quickTasksApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks-by-category'] });
    },
  });

  const toggleTodayMutation = useMutation({
    mutationFn: quickTasksApi.toggleToday,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: quickTasksApi.reorder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
    },
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    createMutation.mutate({
      title: quickAdd,
      category: quickCategory,
      priority: 'medium',
    });
  };

  const moveTask = (taskId: number, direction: 'up' | 'down') => {
    if (!tasks) return;
    const taskIds = tasks.map((t: any) => t.id);
    const index = taskIds.indexOf(taskId);
    if (direction === 'up' && index > 0) {
      [taskIds[index], taskIds[index - 1]] = [taskIds[index - 1], taskIds[index]];
      reorderMutation.mutate(taskIds);
    } else if (direction === 'down' && index < taskIds.length - 1) {
      [taskIds[index], taskIds[index + 1]] = [taskIds[index + 1], taskIds[index]];
      reorderMutation.mutate(taskIds);
    }
  };

  const getCategoryInfo = (catId: string) => CATEGORIES.find((c) => c.id === catId);
  const getPriorityInfo = (pId: string) => PRIORITIES.find((p) => p.id === pId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-islamic-green text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 text-sm"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleQuickAdd} className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex gap-2">
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="px-2 py-1.5 border rounded-lg bg-gray-50 text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder="Quick add task..."
            className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
          />
          <button
            type="submit"
            disabled={!quickAdd.trim() || createMutation.isPending}
            className="px-3 py-1.5 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      {/* Category Summary */}
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = byCategory?.[cat.id]?.length || 0;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className={`p-2 rounded-lg transition text-center ${
                isSelected
                  ? 'bg-islamic-green text-white'
                  : 'bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <Icon size={18} className={`mx-auto ${isSelected ? '' : 'text-gray-400'}`} />
              <p className="text-lg font-bold">{count}</p>
              <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                {cat.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">
            {selectedCategory
              ? `${getCategoryInfo(selectedCategory)?.label} Tasks`
              : 'All Tasks'}
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Show All
            </button>
          )}
        </div>

        <div className="p-3 space-y-3">
          {isLoading ? (
            <div className="text-center py-6 text-gray-500 text-sm">Loading...</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              No tasks. Add one above!
            </div>
          ) : (
            tasks?.map((task: any, index: number) => {
              const cat = getCategoryInfo(task.category);
              const priority = getPriorityInfo(task.priority);

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-lg p-3 shadow-sm border-l-4 ${
                    task.is_today ? 'border-amber-500 bg-amber-50' : 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Move buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => moveTask(task.id, 'up')}
                        disabled={index === 0}
                        className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveTask(task.id, 'down')}
                        disabled={index === tasks.length - 1}
                        className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Task content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${cat?.color}`}>
                          {cat?.label}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${priority?.color}`}>
                          {priority?.label}
                        </span>
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={12} />
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {task.is_today && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                            <Sun size={12} />
                            Today
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action icons with colors */}
                    <div className="flex items-center gap-1">
                      {/* Mark for Today */}
                      <button
                        onClick={() => toggleTodayMutation.mutate(task.id)}
                        className={`p-1.5 rounded ${
                          task.is_today
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-amber-50 text-amber-400 hover:bg-amber-100 hover:text-amber-600'
                        }`}
                        title={task.is_today ? 'Remove from Today' : 'Mark for Today'}
                      >
                        <Sun size={16} />
                      </button>
                      {/* View Details */}
                      <button
                        onClick={() => setViewingTask(task)}
                        className="p-1.5 bg-blue-50 text-blue-400 hover:bg-blue-100 hover:text-blue-600 rounded"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {/* Mark Complete */}
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
                      {/* Edit */}
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1.5 bg-purple-50 text-purple-400 hover:bg-purple-100 hover:text-purple-600 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      {/* Delete */}
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
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <AddTaskModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(data) => updateMutation.mutate({ id: editingTask.id, data })}
          isPending={updateMutation.isPending}
        />
      )}

      {/* View Task Modal */}
      {viewingTask && (
        <ViewTaskModal
          task={viewingTask}
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
        />
      )}
    </div>
  );
}

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    category: 'personal',
    priority: 'medium',
    due_date: '',
    notes: '',
  });

  const createMutation = useMutation({
    mutationFn: quickTasksApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['quick-tasks-by-category'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Add Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({
              ...formData,
              due_date: formData.due_date || null,
            });
          }}
          className="p-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Task</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSave,
  isPending,
}: {
  task: any;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    category: task.category || 'personal',
    priority: task.priority || 'medium',
    due_date: task.due_date || '',
    notes: task.notes || '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="font-semibold">Edit Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="p-4 space-y-3"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Task</label>
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
              <label className="block text-xs font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-1.5 border rounded-lg text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
              rows={2}
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
              disabled={isPending}
              className="flex-1 py-1.5 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
            >
              {isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewTaskModal({
  task,
  onClose,
  onEdit,
  onComplete,
}: {
  task: any;
  onClose: () => void;
  onEdit: () => void;
  onComplete: () => void;
}) {
  const cat = CATEGORIES.find((c) => c.id === task.category);
  const priority = PRIORITIES.find((p) => p.id === task.priority);
  const CatIcon = cat?.icon || User;

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
          <h3 className="font-semibold">{task.title}</h3>

          {/* Category & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${cat?.color}`}>
              <CatIcon size={14} />
              <span className="text-xs font-medium">{cat?.label}</span>
            </div>
            <div className={`px-2 py-1 rounded ${priority?.color}`}>
              <span className="text-xs font-medium">{priority?.label}</span>
            </div>
            {task.is_today && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-100 text-amber-700">
                <Sun size={14} />
                <span className="text-xs font-medium">Today</span>
              </div>
            )}
          </div>

          {/* Due Date */}
          {task.due_date && (
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Clock size={14} />
              <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500 mb-0.5">Notes</p>
              <p className="text-sm text-gray-700">{task.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onEdit}
              className="flex-1 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 flex items-center justify-center gap-1.5 text-sm"
            >
              <Edit2 size={14} />
              Edit
            </button>
            <button
              onClick={onComplete}
              className="flex-1 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center gap-1.5 text-sm"
            >
              <CheckCircle size={14} />
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
