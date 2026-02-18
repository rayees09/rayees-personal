import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { remindersApi, authApi } from '../services/api';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { Plus, Check, Trash2, X, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';

const REMINDER_TYPES = [
  { id: 'general', label: 'General', color: 'bg-gray-100 text-gray-700' },
  { id: 'appointment', label: 'Appointment', color: 'bg-blue-100 text-blue-700' },
  { id: 'bill', label: 'Bill/Payment', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'school', label: 'School', color: 'bg-purple-100 text-purple-700' },
  { id: 'islamic', label: 'Islamic', color: 'bg-green-100 text-green-700' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: 'text-gray-500' },
  { id: 'medium', label: 'Medium', color: 'text-blue-500' },
  { id: 'high', label: 'High', color: 'text-orange-500' },
  { id: 'urgent', label: 'Urgent', color: 'text-red-500' },
];

export default function Reminders() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders', filterType],
    queryFn: () => remindersApi.getAll(false, filterType || undefined),
  });

  const { data: upcoming } = useQuery({
    queryKey: ['reminders-upcoming'],
    queryFn: () => remindersApi.getUpcoming(7),
  });

  const completeMutation = useMutation({
    mutationFn: remindersApi.complete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminders-upcoming'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: remindersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminders-upcoming'] });
    },
  });

  const getTypeInfo = (typeId: string) => REMINDER_TYPES.find((t) => t.id === typeId);
  const getPriorityInfo = (pId: string) => PRIORITIES.find((p) => p.id === pId);

  const urgentReminders = reminders?.filter(
    (r: any) => r.priority === 'urgent' || r.priority === 'high'
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Family Reminders</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-islamic-green text-white px-4 py-2 rounded-lg hover:bg-teal-700"
        >
          <Plus size={20} />
          Add Reminder
        </button>
      </div>

      {/* Urgent Reminders */}
      {urgentReminders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-red-500" />
            <h2 className="font-semibold text-red-700">Urgent Reminders</h2>
          </div>
          <div className="space-y-2">
            {urgentReminders.map((reminder: any) => (
              <div
                key={reminder.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg"
              >
                <div>
                  <p className="font-medium">{reminder.title}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(reminder.remind_at), 'MMM d, h:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => completeMutation.mutate(reminder.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Check size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming This Week */}
      {upcoming && upcoming.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-500" />
            <h2 className="font-semibold text-blue-700">Coming Up This Week</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {upcoming.slice(0, 5).map((reminder: any) => (
              <div
                key={reminder.id}
                className="flex-shrink-0 w-48 p-3 bg-white rounded-lg shadow-sm"
              >
                <p className="font-medium text-sm truncate">{reminder.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(reminder.remind_at), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterType(null)}
          className={`px-3 py-1 rounded-full text-sm ${
            filterType === null
              ? 'bg-islamic-green text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {REMINDER_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setFilterType(type.id)}
            className={`px-3 py-1 rounded-full text-sm ${
              filterType === type.id
                ? 'bg-islamic-green text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <h2 className="font-semibold">All Reminders</h2>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : reminders?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reminders. Add one to get started!
            </div>
          ) : (
            reminders?.map((reminder: any) => {
              const type = getTypeInfo(reminder.reminder_type);
              const priority = getPriorityInfo(reminder.priority);
              const isOverdue = isPast(new Date(reminder.remind_at));

              return (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-lg border ${
                    isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => completeMutation.mutate(reminder.id)}
                      className="mt-1 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center"
                    >
                      {completeMutation.isPending && <span>...</span>}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{reminder.title}</h3>
                          {reminder.description && (
                            <p className="text-sm text-gray-500 mt-1">{reminder.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(reminder.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${type?.color}`}>
                          {type?.label}
                        </span>
                        <span className={`text-xs font-medium ${priority?.color}`}>
                          {priority?.label}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock size={12} />
                          {format(new Date(reminder.remind_at), 'MMM d, h:mm a')}
                        </span>
                        {isOverdue && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                        {reminder.is_recurring && (
                          <span className="text-xs text-blue-600">
                            Repeats {reminder.recurrence_pattern}
                          </span>
                        )}
                        {reminder.for_users && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Users size={12} />
                            Specific members
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Reminder Modal */}
      {showAddModal && <AddReminderModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function AddReminderModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    remind_at: '',
    remind_time: '',
    reminder_type: 'general',
    priority: 'medium',
    is_recurring: false,
    recurrence_pattern: 'daily',
    for_all: true,
    selected_users: [] as number[],
  });

  const { data: family } = useQuery({
    queryKey: ['family'],
    queryFn: authApi.getFamily,
  });

  const createMutation = useMutation({
    mutationFn: remindersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminders-upcoming'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const remindAt = new Date(`${formData.remind_at}T${formData.remind_time || '09:00'}`);

    createMutation.mutate({
      title: formData.title,
      description: formData.description || null,
      remind_at: remindAt.toISOString(),
      reminder_type: formData.reminder_type,
      priority: formData.priority,
      is_recurring: formData.is_recurring,
      recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
      for_users: formData.for_all ? null : formData.selected_users,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Add Reminder</h2>
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
              placeholder="What to remember?"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={formData.remind_at}
                onChange={(e) => setFormData({ ...formData, remind_at: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Time</label>
              <input
                type="time"
                value={formData.remind_time}
                onChange={(e) => setFormData({ ...formData, remind_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select
                value={formData.reminder_type}
                onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {REMINDER_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
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

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.is_recurring}
              onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="recurring" className="text-sm">
              Repeat this reminder
            </label>
            {formData.is_recurring && (
              <select
                value={formData.recurrence_pattern}
                onChange={(e) =>
                  setFormData({ ...formData, recurrence_pattern: e.target.value })
                }
                className="px-2 py-1 border rounded text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            )}
          </div>

          {/* For whom */}
          <div>
            <label className="block text-sm font-medium mb-2">Remind</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.for_all}
                  onChange={() => setFormData({ ...formData, for_all: true })}
                />
                <span className="text-sm">All family members</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!formData.for_all}
                  onChange={() => setFormData({ ...formData, for_all: false })}
                />
                <span className="text-sm">Specific members</span>
              </label>
            </div>

            {!formData.for_all && family && (
              <div className="mt-2 flex flex-wrap gap-2">
                {family.map((member: any) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      const selected = formData.selected_users.includes(member.id)
                        ? formData.selected_users.filter((id) => id !== member.id)
                        : [...formData.selected_users, member.id];
                      setFormData({ ...formData, selected_users: selected });
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      formData.selected_users.includes(member.id)
                        ? 'bg-islamic-green text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Reminder'}
          </button>
        </form>
      </div>
    </div>
  );
}
