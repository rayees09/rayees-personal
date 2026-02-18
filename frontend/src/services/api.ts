import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const settingsApi = {
  get: async (key: string) => {
    const res = await api.get(`/settings/${key}`);
    return res.data;
  },
  set: async (key: string, value: string) => {
    const res = await api.put(`/settings/${key}?value=${encodeURIComponent(value)}`);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
};

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  loginWithUsername: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
  register: async (data: any) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  getFamily: async () => {
    const res = await api.get('/auth/family');
    return res.data;
  },
  updateUser: async (userId: number, data: any) => {
    const res = await api.put(`/auth/users/${userId}`, data);
    return res.data;
  },
};

// Tasks API
export const tasksApi = {
  getTasks: async (params?: any) => {
    const res = await api.get('/tasks', { params });
    return res.data;
  },
  createTask: async (data: any) => {
    const res = await api.post('/tasks', data);
    return res.data;
  },
  updateTask: async (id: number, data: any) => {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data;
  },
  completeTask: async (id: number) => {
    const res = await api.post(`/tasks/${id}/complete`);
    return res.data;
  },
  deleteTask: async (id: number) => {
    const res = await api.delete(`/tasks/${id}`);
    return res.data;
  },
  getPoints: async (userId: number) => {
    const res = await api.get(`/tasks/points/${userId}`);
    return res.data;
  },
  getRewards: async () => {
    const res = await api.get('/tasks/rewards');
    return res.data;
  },
  redeemReward: async (rewardId: number) => {
    const res = await api.post(`/tasks/rewards/${rewardId}/redeem`);
    return res.data;
  },
};

// Islamic API
export const islamicApi = {
  getDailyPrayers: async (userId: number, date: string) => {
    const res = await api.get(`/islamic/prayers/${userId}/${date}`);
    return res.data;
  },
  logPrayer: async (data: any) => {
    const res = await api.post('/islamic/prayers', data);
    return res.data;
  },
  getQuranProgress: async (userId: number) => {
    const res = await api.get(`/islamic/quran/${userId}`);
    return res.data;
  },
  updateQuranProgress: async (data: any) => {
    const res = await api.post('/islamic/quran', data);
    return res.data;
  },
  getSurahs: async () => {
    const res = await api.get('/islamic/quran/surahs');
    return res.data;
  },
  getRamadanLog: async (userId: number, year?: number) => {
    const res = await api.get(`/islamic/ramadan/${userId}`, { params: { year } });
    return res.data;
  },
  logRamadanDay: async (data: any) => {
    const res = await api.post('/islamic/ramadan', data);
    return res.data;
  },
  getRamadanSummary: async (userId: number, year?: number) => {
    const res = await api.get(`/islamic/ramadan/${userId}/summary`, { params: { year } });
    return res.data;
  },
};

// Learning API
export const learningApi = {
  uploadHomework: async (formData: FormData) => {
    const res = await api.post('/learning/homework/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getHomeworkHistory: async (userId: number) => {
    const res = await api.get(`/learning/homework/${userId}`);
    return res.data;
  },
  generateWorksheet: async (data: any) => {
    const res = await api.post('/learning/worksheet/generate', data);
    return res.data;
  },
  gradeWorksheet: async (worksheetId: number, formData: FormData) => {
    const res = await api.post(`/learning/worksheet/${worksheetId}/grade`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  assignWorksheet: async (worksheetId: number, assignedTo: number, dueDate?: string) => {
    const params = new URLSearchParams();
    params.append('assigned_to', assignedTo.toString());
    if (dueDate) params.append('due_date', dueDate);
    const res = await api.post(`/learning/worksheet/${worksheetId}/assign?${params.toString()}`);
    return res.data;
  },
  getAssignedWorksheets: async (userId: number, status?: string) => {
    const res = await api.get(`/learning/worksheets/assigned/${userId}`, { params: { status } });
    return res.data;
  },
  getWorksheet: async (worksheetId: number) => {
    const res = await api.get(`/learning/worksheet/${worksheetId}`);
    return res.data;
  },
  startWorksheet: async (worksheetId: number) => {
    const res = await api.post(`/learning/worksheet/${worksheetId}/start`);
    return res.data;
  },
  submitWorksheet: async (worksheetId: number, formData: FormData) => {
    const res = await api.post(`/learning/worksheet/${worksheetId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getProficiency: async (userId: number, subject?: string) => {
    const res = await api.get(`/learning/proficiency/${userId}`, { params: { subject } });
    return res.data;
  },
  getWeakAreas: async (userId: number) => {
    const res = await api.get(`/learning/weak-areas/${userId}`);
    return res.data;
  },
  imageToTask: async (formData: FormData) => {
    const res = await api.post('/learning/image-to-task', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getParentSuggestions: async (userId: number, subject: string) => {
    const res = await api.get(`/learning/suggestions/${userId}`, { params: { subject } });
    return res.data;
  },
};

// Quran Reading Goals API
export const quranGoalsApi = {
  createGoal: async (data: { title: string; target_days: number; start_date: string; total_pages?: number }) => {
    const res = await api.post('/quran-goals/create', data);
    return res.data;
  },
  getActiveGoal: async (userId?: number) => {
    const res = await api.get('/quran-goals/active', { params: { user_id: userId } });
    return res.data;
  },
  logReading: async (formData: FormData) => {
    const res = await api.post('/quran-goals/log', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  logReadingFromImage: async (formData: FormData) => {
    const res = await api.post('/quran-goals/log-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getReadingLogs: async (userId?: number) => {
    const res = await api.get('/quran-goals/logs', { params: { user_id: userId } });
    return res.data;
  },
  updateReadingLog: async (logId: number, pagesRead: number) => {
    const res = await api.put(`/quran-goals/logs/${logId}?pages_read=${pagesRead}`);
    return res.data;
  },
  deleteReadingLog: async (logId: number) => {
    const res = await api.delete(`/quran-goals/logs/${logId}`);
    return res.data;
  },
  getStats: async (userId?: number) => {
    const res = await api.get('/quran-goals/stats', { params: { user_id: userId } });
    return res.data;
  },
  updateGoal: async (goalId: number, data: { title?: string; target_days?: number; start_date?: string; current_page?: number }) => {
    const params = new URLSearchParams();
    if (data.title) params.append('title', data.title);
    if (data.target_days) params.append('target_days', data.target_days.toString());
    if (data.start_date) params.append('start_date', data.start_date);
    if (data.current_page !== undefined) params.append('current_page', data.current_page.toString());
    const res = await api.put(`/quran-goals/update/${goalId}?${params.toString()}`);
    return res.data;
  },
  deleteGoal: async (goalId: number) => {
    const res = await api.delete(`/quran-goals/delete/${goalId}`);
    return res.data;
  },
};

// Family Reminders API
export const remindersApi = {
  create: async (data: any) => {
    const res = await api.post('/reminders', data);
    return res.data;
  },
  getAll: async (includeCompleted?: boolean, reminderType?: string) => {
    const res = await api.get('/reminders', {
      params: { include_completed: includeCompleted, reminder_type: reminderType },
    });
    return res.data;
  },
  getUpcoming: async (days?: number) => {
    const res = await api.get('/reminders/upcoming', { params: { days } });
    return res.data;
  },
  complete: async (id: number) => {
    const res = await api.put(`/reminders/${id}/complete`);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/reminders/${id}`);
    return res.data;
  },
};

// Quick Tasks API (for Rayees personal/office tasks)
export const quickTasksApi = {
  create: async (data: any) => {
    const res = await api.post('/quick-tasks', data);
    return res.data;
  },
  getAll: async (category?: string, includeCompleted?: boolean) => {
    const res = await api.get('/quick-tasks', {
      params: { category, include_completed: includeCompleted },
    });
    return res.data;
  },
  getByCategory: async () => {
    const res = await api.get('/quick-tasks/by-category');
    return res.data;
  },
  complete: async (id: number) => {
    const res = await api.put(`/quick-tasks/${id}/complete`);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/quick-tasks/${id}`);
    return res.data;
  },
  update: async (id: number, data: any) => {
    const params = new URLSearchParams();
    if (data.title) params.append('title', data.title);
    if (data.category) params.append('category', data.category);
    if (data.priority) params.append('priority', data.priority);
    if (data.due_date) params.append('due_date', data.due_date);
    if (data.notes !== undefined) params.append('notes', data.notes || '');
    const res = await api.put(`/quick-tasks/${id}?${params.toString()}`);
    return res.data;
  },
};

// Ramadan Goals API
export const ramadanGoalsApi = {
  create: async (data: { year: number; title: string; description?: string; target_value: number; unit: string; goal_type: string }) => {
    const res = await api.post('/islamic/ramadan-goals', data);
    return res.data;
  },
  getAll: async (year?: number, userId?: number) => {
    const res = await api.get('/islamic/ramadan-goals', { params: { year, user_id: userId } });
    return res.data;
  },
  delete: async (goalId: number) => {
    const res = await api.delete(`/islamic/ramadan-goals/${goalId}`);
    return res.data;
  },
  logProgress: async (data: { goal_id: number; date: string; value: number; notes?: string }) => {
    const res = await api.post('/islamic/ramadan-goals/log', data);
    return res.data;
  },
  getLogs: async (goalId: number) => {
    const res = await api.get(`/islamic/ramadan-goals/${goalId}/logs`);
    return res.data;
  },
  deleteLog: async (logId: number) => {
    const res = await api.delete(`/islamic/ramadan-goals/log/${logId}`);
    return res.data;
  },
};

// Zakat API
export const zakatApi = {
  createConfig: async (data: { year: number; total_due: number; currency: string; notes?: string }) => {
    const res = await api.post('/islamic/zakat/config', data);
    return res.data;
  },
  getConfigs: async (year?: number) => {
    const res = await api.get('/islamic/zakat/config', { params: { year } });
    return res.data;
  },
  getConfig: async (configId: number) => {
    const res = await api.get(`/islamic/zakat/config/${configId}`);
    return res.data;
  },
  updateConfig: async (configId: number, data: { total_due?: number; currency?: string; notes?: string }) => {
    const params = new URLSearchParams();
    if (data.total_due !== undefined) params.append('total_due', data.total_due.toString());
    if (data.currency) params.append('currency', data.currency);
    if (data.notes !== undefined) params.append('notes', data.notes || '');
    const res = await api.put(`/islamic/zakat/config/${configId}?${params.toString()}`);
    return res.data;
  },
  deleteConfig: async (configId: number) => {
    const res = await api.delete(`/islamic/zakat/config/${configId}`);
    return res.data;
  },
  addPayment: async (data: { config_id: number; date: string; amount: number; recipient?: string; notes?: string }) => {
    const res = await api.post('/islamic/zakat/payment', data);
    return res.data;
  },
  getPayments: async (configId: number) => {
    const res = await api.get(`/islamic/zakat/payments/${configId}`);
    return res.data;
  },
  deletePayment: async (paymentId: number) => {
    const res = await api.delete(`/islamic/zakat/payment/${paymentId}`);
    return res.data;
  },
};

// Expenses API
export const expensesApi = {
  createCategory: async (data: { name: string; expense_type: string; default_amount?: number; is_recurring?: boolean }) => {
    const res = await api.post('/expenses/categories', data);
    return res.data;
  },
  getCategories: async (expenseType?: string) => {
    const res = await api.get('/expenses/categories', { params: { expense_type: expenseType } });
    return res.data;
  },
  updateCategory: async (categoryId: number, data: any) => {
    const params = new URLSearchParams();
    if (data.name) params.append('name', data.name);
    if (data.default_amount !== undefined) params.append('default_amount', data.default_amount.toString());
    if (data.is_recurring !== undefined) params.append('is_recurring', data.is_recurring.toString());
    const res = await api.put(`/expenses/categories/${categoryId}?${params.toString()}`);
    return res.data;
  },
  deleteCategory: async (categoryId: number) => {
    const res = await api.delete(`/expenses/categories/${categoryId}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/expenses', data);
    return res.data;
  },
  getAll: async (year: number, month: number, expenseType?: string) => {
    const res = await api.get('/expenses', { params: { year, month, expense_type: expenseType } });
    return res.data;
  },
  getSummary: async (year: number, month: number) => {
    const res = await api.get('/expenses/summary', { params: { year, month } });
    return res.data;
  },
  update: async (expenseId: number, data: any) => {
    const params = new URLSearchParams();
    if (data.title) params.append('title', data.title);
    if (data.amount !== undefined) params.append('amount', data.amount.toString());
    if (data.is_paid !== undefined) params.append('is_paid', data.is_paid.toString());
    if (data.notes !== undefined) params.append('notes', data.notes || '');
    const res = await api.put(`/expenses/${expenseId}?${params.toString()}`);
    return res.data;
  },
  togglePaid: async (expenseId: number) => {
    const res = await api.put(`/expenses/${expenseId}/toggle-paid`);
    return res.data;
  },
  delete: async (expenseId: number) => {
    const res = await api.delete(`/expenses/${expenseId}`);
    return res.data;
  },
  initMonth: async (year: number, month: number, expenseType: string = 'personal') => {
    const res = await api.post('/expenses/init-month', null, { params: { year, month, expense_type: expenseType } });
    return res.data;
  },
};

// AI Context API (for ChatGPT integration)
export const aiApi = {
  getContext: async () => {
    const res = await api.get('/ai/context');
    return res.data;
  },
  getContextText: async () => {
    const res = await api.get('/ai/context/text');
    return res.data;
  },
};

export default api;
