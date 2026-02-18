import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { zakatApi } from '../services/api';
import { format } from 'date-fns';
import { Coins, Plus, Trash2, X, TrendingUp, CheckCircle, Edit2 } from 'lucide-react';

export default function Zakat() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [showEditConfig, setShowEditConfig] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);

  const [configForm, setConfigForm] = useState({
    year: currentYear,
    total_due: 0,
    currency: 'USD',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    total_due: 0,
    currency: 'USD',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: 0,
    recipient: '',
    notes: '',
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ['zakat-configs'],
    queryFn: () => zakatApi.getConfigs(),
  });

  const { data: payments } = useQuery({
    queryKey: ['zakat-payments', selectedConfigId],
    queryFn: () => zakatApi.getPayments(selectedConfigId!),
    enabled: !!selectedConfigId,
  });

  const createConfigMutation = useMutation({
    mutationFn: zakatApi.createConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakat-configs'] });
      setShowAddConfig(false);
      setConfigForm({ year: currentYear, total_due: 0, currency: 'USD', notes: '' });
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: { id: number; total_due?: number; currency?: string; notes?: string }) =>
      zakatApi.updateConfig(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakat-configs'] });
      setShowEditConfig(false);
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: zakatApi.deleteConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakat-configs'] });
      setSelectedConfigId(null);
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: (data: any) => zakatApi.addPayment({ ...data, config_id: selectedConfigId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakat-configs'] });
      queryClient.invalidateQueries({ queryKey: ['zakat-payments'] });
      setShowAddPayment(false);
      setPaymentForm({ date: format(new Date(), 'yyyy-MM-dd'), amount: 0, recipient: '', notes: '' });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: zakatApi.deletePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zakat-configs'] });
      queryClient.invalidateQueries({ queryKey: ['zakat-payments'] });
    },
  });

  const selectedConfig = configs?.find((c: any) => c.id === selectedConfigId);
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (user?.role !== 'parent') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Only parents can access Zakat tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="text-islamic-green" size={28} />
          <h1 className="text-2xl font-bold">Zakat Tracker</h1>
        </div>
        <button
          onClick={() => setShowAddConfig(true)}
          className="flex items-center gap-2 px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700"
        >
          <Plus size={18} />
          Add Year
        </button>
      </div>

      {/* Year Cards */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : configs?.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <Coins className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 mb-4">No Zakat configuration yet.</p>
          <button
            onClick={() => setShowAddConfig(true)}
            className="px-4 py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700"
          >
            Configure Zakat for {currentYear}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {configs?.map((config: any) => {
            const progressPercent = Math.min(100, (config.total_paid / config.total_due) * 100);
            const isCompleted = config.total_paid >= config.total_due;

            return (
              <div
                key={config.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer transition hover:shadow-md ${
                  selectedConfigId === config.id ? 'ring-2 ring-islamic-green' : ''
                }`}
                onClick={() => setSelectedConfigId(config.id)}
              >
                <div className={`p-4 ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-islamic-green to-teal-600'} text-white`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">Zakat {config.year}</h3>
                    {isCompleted && <CheckCircle size={24} />}
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(config.total_due, config.currency)}</p>
                </div>

                <div className="p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(config.total_paid, config.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="text-gray-600">Remaining</span>
                    <span className={`font-semibold ${config.remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(config.remaining, config.currency)}
                    </span>
                  </div>

                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-islamic-green'}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{Math.round(progressPercent)}% paid</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Config Details */}
      {selectedConfig && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold">Zakat {selectedConfig.year} Payments</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center gap-1 px-3 py-1 bg-islamic-green text-white rounded-lg hover:bg-teal-700 text-sm"
              >
                <Plus size={16} />
                Add Payment
              </button>
              <button
                onClick={() => {
                  setEditForm({
                    total_due: selectedConfig.total_due,
                    currency: selectedConfig.currency,
                    notes: selectedConfig.notes || '',
                  });
                  setShowEditConfig(true);
                }}
                className="p-1 text-blue-500 hover:text-blue-700"
                title="Edit Zakat"
              >
                <Edit2 size={18} />
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this Zakat configuration?')) {
                    deleteConfigMutation.mutate(selectedConfig.id);
                  }
                }}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {selectedConfig.notes && (
            <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600">
              {selectedConfig.notes}
            </div>
          )}

          <div className="p-4">
            {payments?.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No payments recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {payments?.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(payment.amount, selectedConfig.currency)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(payment.date), 'MMM d, yyyy')}
                        {payment.recipient && ` - ${payment.recipient}`}
                      </p>
                      {payment.notes && <p className="text-xs text-gray-400">{payment.notes}</p>}
                    </div>
                    <button
                      onClick={() => deletePaymentMutation.mutate(payment.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Config Modal */}
      {showAddConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Configure Zakat</h3>
              <button onClick={() => setShowAddConfig(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Year</label>
                <select
                  value={configForm.year}
                  onChange={(e) => setConfigForm({ ...configForm, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total Zakat Due</label>
                <input
                  type="number"
                  min="0"
                  value={configForm.total_due || ''}
                  onChange={(e) => setConfigForm({ ...configForm, total_due: parseInt(e.target.value) || 0 })}
                  placeholder="Enter total amount"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={configForm.currency}
                  onChange={(e) => setConfigForm({ ...configForm, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="USD">USD (US Dollar)</option>
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={configForm.notes}
                  onChange={(e) => setConfigForm({ ...configForm, notes: e.target.value })}
                  placeholder="Any notes about this year's Zakat calculation"
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <button
                onClick={() => createConfigMutation.mutate(configForm)}
                disabled={!configForm.total_due || createConfigMutation.isPending}
                className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {createConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Config Modal */}
      {showEditConfig && selectedConfigId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Edit Zakat {selectedConfig?.year}</h3>
              <button onClick={() => setShowEditConfig(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total Zakat Due</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.total_due || ''}
                  onChange={(e) => setEditForm({ ...editForm, total_due: parseInt(e.target.value) || 0 })}
                  placeholder="Enter total amount"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="USD">USD (US Dollar)</option>
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="GBP">GBP (British Pound)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Any notes about this year's Zakat calculation"
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <button
                onClick={() => updateConfigMutation.mutate({ id: selectedConfigId, ...editForm })}
                disabled={!editForm.total_due || updateConfigMutation.isPending}
                className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showAddPayment && selectedConfigId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Add Zakat Payment</h3>
              <button onClick={() => setShowAddPayment(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Amount ({selectedConfig?.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseInt(e.target.value) || 0 })}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Recipient (optional)</label>
                <input
                  type="text"
                  value={paymentForm.recipient}
                  onChange={(e) => setPaymentForm({ ...paymentForm, recipient: e.target.value })}
                  placeholder="Who received this Zakat?"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Any additional notes"
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={2}
                />
              </div>
              <button
                onClick={() => addPaymentMutation.mutate(paymentForm)}
                disabled={!paymentForm.amount || addPaymentMutation.isPending}
                className="w-full py-2 bg-islamic-green text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {addPaymentMutation.isPending ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
