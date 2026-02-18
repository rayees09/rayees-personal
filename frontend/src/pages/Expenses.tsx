import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { expensesApi } from '../services/api';
// import { format } from 'date-fns';
import { Wallet, Building2, Plus, Trash2, X, Check, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Expenses() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'personal' | 'company'>('personal');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showManageCategories, setShowManageCategories] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: 0,
    category_id: null as number | null,
    notes: '',
    is_paid: false,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    expense_type: 'personal',
    default_amount: 0,
    is_recurring: true,
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', selectedYear, selectedMonth, activeTab],
    queryFn: () => expensesApi.getAll(selectedYear, selectedMonth, activeTab),
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', selectedYear, selectedMonth],
    queryFn: () => expensesApi.getSummary(selectedYear, selectedMonth),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories', activeTab],
    queryFn: () => expensesApi.getCategories(activeTab),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => expensesApi.create({
      ...data,
      year: selectedYear,
      month: selectedMonth,
      expense_type: activeTab,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      setShowAddExpense(false);
      setExpenseForm({ title: '', amount: 0, category_id: null, notes: '', is_paid: false });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: expensesApi.togglePaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: expensesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: expensesApi.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      setCategoryForm({ name: '', expense_type: activeTab, default_amount: 0, is_recurring: true });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: expensesApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    },
  });

  const initMonthMutation = useMutation({
    mutationFn: () => expensesApi.initMonth(selectedYear, selectedMonth, activeTab),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });

  const currentSummary = activeTab === 'personal' ? summary?.personal : summary?.company;

  const changeMonth = (delta: number) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (user?.role !== 'parent') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Only parents can access expense tracking.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <button
          onClick={() => setShowManageCategories(true)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
            activeTab === 'personal' ? 'bg-white shadow text-islamic-green' : 'text-gray-600'
          }`}
        >
          <Wallet size={18} />
          Personal
        </button>
        <button
          onClick={() => setActiveTab('company')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
            activeTab === 'company' ? 'bg-white shadow text-blue-600' : 'text-gray-600'
          }`}
        >
          <Building2 size={18} />
          Company
        </button>
      </div>

      {/* Month Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold">{MONTHS[selectedMonth - 1]}</p>
            <p className="text-sm text-gray-500">{selectedYear}</p>
          </div>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-xl font-bold">{formatCurrency(currentSummary?.total_amount || 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(currentSummary?.paid_amount || 0)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-xl font-bold text-orange-600">{formatCurrency(currentSummary?.pending_amount || 0)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowAddExpense(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg ${
            activeTab === 'personal' ? 'bg-islamic-green hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          <Plus size={18} />
          Add Expense
        </button>
        <button
          onClick={() => initMonthMutation.mutate()}
          disabled={initMonthMutation.isPending}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
        >
          Init Month
        </button>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className={`p-4 border-b ${activeTab === 'personal' ? 'bg-islamic-green' : 'bg-blue-600'} text-white`}>
          <h2 className="font-semibold">{activeTab === 'personal' ? 'Personal' : 'Company'} Expenses</h2>
        </div>

        <div className="p-4">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Loading...</p>
          ) : expenses?.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No expenses for this month.</p>
          ) : (
            <div className="space-y-3">
              {expenses?.map((expense: any) => (
                <div
                  key={expense.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-l-4 ${
                    expense.is_paid ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePaidMutation.mutate(expense.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        expense.is_paid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                      }`}
                    >
                      {expense.is_paid && <Check size={14} />}
                    </button>
                    <div>
                      <p className={`font-medium ${expense.is_paid ? 'text-green-700' : ''}`}>
                        {expense.title}
                      </p>
                      {expense.category_name && (
                        <p className="text-xs text-gray-500">{expense.category_name}</p>
                      )}
                      {expense.notes && (
                        <p className="text-xs text-gray-400">{expense.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${expense.is_paid ? 'text-green-600' : ''}`}>
                      {formatCurrency(expense.amount)}
                    </span>
                    <button
                      onClick={() => deleteExpenseMutation.mutate(expense.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">Add {activeTab === 'personal' ? 'Personal' : 'Company'} Expense</h3>
              <button onClick={() => setShowAddExpense(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="e.g., Rent, Groceries, Salary"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseInt(e.target.value) || 0 })}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category (optional)</label>
                <select
                  value={expenseForm.category_id || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">No category</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Any additional notes"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_paid"
                  checked={expenseForm.is_paid}
                  onChange={(e) => setExpenseForm({ ...expenseForm, is_paid: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_paid" className="text-sm">Mark as paid</label>
              </div>
              <button
                onClick={() => createExpenseMutation.mutate(expenseForm)}
                disabled={!expenseForm.title.trim() || !expenseForm.amount || createExpenseMutation.isPending}
                className={`w-full py-2 text-white rounded-lg disabled:opacity-50 ${
                  activeTab === 'personal' ? 'bg-islamic-green hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {createExpenseMutation.isPending ? 'Adding...' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Categories Modal */}
      {showManageCategories && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h3 className="font-semibold">Manage Categories</h3>
              <button onClick={() => setShowManageCategories(false)} className="text-gray-500">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Add Category */}
              <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Add New Category</h4>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Category name"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={categoryForm.expense_type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, expense_type: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="personal">Personal</option>
                    <option value="company">Company</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.default_amount || ''}
                    onChange={(e) => setCategoryForm({ ...categoryForm, default_amount: parseInt(e.target.value) || 0 })}
                    placeholder="Default amount"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_recurring"
                    checked={categoryForm.is_recurring}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_recurring: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_recurring" className="text-sm">Recurring monthly</label>
                </div>
                <button
                  onClick={() => createCategoryMutation.mutate(categoryForm)}
                  disabled={!categoryForm.name.trim() || createCategoryMutation.isPending}
                  className="w-full py-2 bg-islamic-green text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
                >
                  Add Category
                </button>
              </div>

              {/* Existing Categories */}
              <div>
                <h4 className="font-medium text-sm mb-2">Personal Categories</h4>
                {categories?.filter((c: any) => c.expense_type === 'personal').map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 border-b">
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      {cat.default_amount > 0 && (
                        <p className="text-xs text-gray-500">{formatCurrency(cat.default_amount)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCategoryMutation.mutate(cat.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="font-medium text-sm mb-2">Company Categories</h4>
                {categories?.filter((c: any) => c.expense_type === 'company').map((cat: any) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 border-b">
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      {cat.default_amount > 0 && (
                        <p className="text-xs text-gray-500">{formatCurrency(cat.default_amount)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCategoryMutation.mutate(cat.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
