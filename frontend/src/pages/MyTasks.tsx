import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickTasksApi } from '../services/api';
import { format } from 'date-fns';
import { Plus, Briefcase, User, Heart, DollarSign, Users, X, Clock, Edit2, Trash2 } from 'lucide-react';

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

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    createMutation.mutate({
      title: quickAdd,
      category: quickCategory,
      priority: 'medium',
    });
  };

  const getCategoryInfo = (catId: string) => CATEGORIES.find((c) => c.id === catId);
  const getPriorityInfo = (pId: string) => PRIORITIES.find((p) => p.id === pId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-islamic-green text-white px-4 py-2 rounded-lg hover:bg-teal-700"
        >
          <Plus size={20} />
          Add Task
        </button>
      </div>

      {/* Quick Add */}
      <form onSubmit={handleQuickAdd} className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex gap-2">
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-gray-50"
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
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={!quickAdd.trim() || createMutation.isPending}
            className="px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus size={20} />
          </button>
        </div>
      </form>

      {/* Category Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = byCategory?.[cat.id]?.length || 0;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className={`p-4 rounded-xl transition ${
                isSelected
                  ? 'bg-islamic-green text-white'
                  : 'bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <Icon size={24} className={isSelected ? '' : 'text-gray-400'} />
              <p className="text-2xl font-bold mt-2">{count}</p>
              <p className={`text-sm ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                {cat.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">
            {selectedCategory
              ? `${getCategoryInfo(selectedCategory)?.label} Tasks`
              : 'All Tasks'}
          </h2>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Show All
            </button>
          )}
        </div>

        <div className="p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : tasks?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks. Add one above!
            </div>
          ) : (
            tasks?.map((task: any) => {
              const cat = getCategoryInfo(task.category);
              const priority = getPriorityInfo(task.priority);
              const CatIcon = cat?.icon || User;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition group"
                >
                  <button
                    onClick={() => completeMutation.mutate(task.id)}
                    className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center"
                  >
                    {completeMutation.isPending && <span className="animate-spin">...</span>}
                  </button>

                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this task?')) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <CatIcon size={20} className="text-gray-400" />
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
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
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Task</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="What needs to be done?"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
            <label className="block text-sm font-medium mb-1">Due Date (optional)</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Task</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(formData);
          }}
          className="p-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Task</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
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
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
