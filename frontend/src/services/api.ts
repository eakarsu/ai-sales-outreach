import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  requestPasswordReset: (email: string) => api.post('/auth/password-reset/request', { email }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    api.post('/auth/password-reset/confirm', { token, newPassword }),
  verifyEmail: (token: string) => api.post('/auth/verify-email', { token }),
  resendVerification: () => api.post('/auth/resend-verification'),
  checkPasswordStrength: (password: string) => api.post('/auth/check-password-strength', { password }),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Teams
export const teamsAPI = {
  getAll: () => api.get('/teams'),
  getById: (id: string) => api.get(`/teams/${id}`),
  create: (data: any) => api.post('/teams', data),
  update: (id: string, data: any) => api.put(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  addMember: (id: string, data: any) => api.post(`/teams/${id}/members`, data),
  removeMember: (id: string, userId: string) => api.delete(`/teams/${id}/members/${userId}`),
};

// Contacts
export const contactsAPI = {
  getAll: (params?: any) => api.get('/contacts', { params }),
  getById: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  bulkImport: (data: any) => api.post('/contacts/bulk', data),
  bulkDelete: (ids: string[]) => api.post('/contacts/bulk-delete', { ids }),
  bulkUpdate: (ids: string[], updates: any) => api.post('/contacts/bulk-update', { ids, updates }),
  exportCSV: (teamId?: string) => api.get('/contacts/export/csv', { params: { teamId }, responseType: 'blob' }),
};

// Templates
export const templatesAPI = {
  getAll: (params?: any) => api.get('/templates', { params }),
  getById: (id: string) => api.get(`/templates/${id}`),
  create: (data: any) => api.post('/templates', data),
  update: (id: string, data: any) => api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  recordUse: (id: string) => api.post(`/templates/${id}/use`),
  bulkDelete: (ids: string[]) => api.post('/templates/bulk-delete', { ids }),
  exportCSV: (teamId?: string) => api.get('/templates/export/csv', { params: { teamId }, responseType: 'blob' }),
};

// Campaigns
export const campaignsAPI = {
  getAll: (params?: any) => api.get('/campaigns', { params }),
  getById: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  start: (id: string) => api.post(`/campaigns/${id}/start`),
  pause: (id: string) => api.post(`/campaigns/${id}/pause`),
  addSequence: (id: string, data: any) => api.post(`/campaigns/${id}/sequences`, data),
  bulkDelete: (ids: string[]) => api.post('/campaigns/bulk-delete', { ids }),
  bulkUpdate: (ids: string[], updates: any) => api.post('/campaigns/bulk-update', { ids, updates }),
  exportCSV: (teamId?: string) => api.get('/campaigns/export/csv', { params: { teamId }, responseType: 'blob' }),
};

// Analytics
export const analyticsAPI = {
  getDashboard: (teamId: string) => api.get('/analytics/dashboard', { params: { teamId } }),
  getROI: (teamId: string) => api.get('/analytics/roi', { params: { teamId } }),
  getPerformance: (teamId: string, period?: number) => api.get('/analytics/performance', { params: { teamId, period } }),
  getEmailStats: (teamId: string) => api.get('/analytics/email-stats', { params: { teamId } }),
};

// Integrations
export const integrationsAPI = {
  getAll: (params?: any) => api.get('/integrations', { params }),
  getById: (id: string) => api.get(`/integrations/${id}`),
  create: (data: any) => api.post('/integrations', data),
  connect: (id: string, config?: any) => api.post(`/integrations/${id}/connect`, { config }),
  disconnect: (id: string) => api.post(`/integrations/${id}/disconnect`),
  sync: (id: string) => api.post(`/integrations/${id}/sync`),
  delete: (id: string) => api.delete(`/integrations/${id}`),
};

// A/B Tests
export const abTestsAPI = {
  getAll: (params?: any) => api.get('/ab-tests', { params }),
  getById: (id: string) => api.get(`/ab-tests/${id}`),
  create: (data: any) => api.post('/ab-tests', data),
  complete: (id: string) => api.post(`/ab-tests/${id}/complete`),
  delete: (id: string) => api.delete(`/ab-tests/${id}`),
};

// AI
export const aiAPI = {
  generateEmail: (data: any) => api.post('/ai/generate-email', data),
  improveEmail: (data: any) => api.post('/ai/improve-email', data),
  generateSubjectLines: (data: any) => api.post('/ai/generate-subject-lines', data),
  analyzeEmail: (data: any) => api.post('/ai/analyze-email', data),
  getGenerations: (teamId: string) => api.get('/ai/generations', { params: { teamId } }),
  getUsage: (teamId: string) => api.get('/ai/usage', { params: { teamId } }),
  getStatus: () => api.get('/ai/status'),

  // Lead Scores
  getLeadScores: (teamId: string) => api.get('/ai/lead-scores', { params: { teamId } }),
  getLeadScore: (id: string) => api.get(`/ai/lead-scores/${id}`),
  scoreLead: (data: any) => api.post('/ai/lead-scores/score', data),
  createLeadScore: (data: any) => api.post('/ai/lead-scores', data),
  updateLeadScore: (id: string, data: any) => api.put(`/ai/lead-scores/${id}`, data),
  deleteLeadScore: (id: string) => api.delete(`/ai/lead-scores/${id}`),

  // Personalizations
  getPersonalizations: (teamId: string) => api.get('/ai/personalizations', { params: { teamId } }),
  getPersonalization: (id: string) => api.get(`/ai/personalizations/${id}`),
  generatePersonalization: (data: any) => api.post('/ai/personalizations/generate', data),
  createPersonalization: (data: any) => api.post('/ai/personalizations', data),
  updatePersonalization: (id: string, data: any) => api.put(`/ai/personalizations/${id}`, data),
  deletePersonalization: (id: string) => api.delete(`/ai/personalizations/${id}`),

  // Best Times
  getBestTimes: (teamId: string) => api.get('/ai/best-times', { params: { teamId } }),
  getBestTime: (id: string) => api.get(`/ai/best-times/${id}`),
  predictBestTime: (data: any) => api.post('/ai/best-times/predict', data),
  createBestTime: (data: any) => api.post('/ai/best-times', data),
  updateBestTime: (id: string, data: any) => api.put(`/ai/best-times/${id}`, data),
  deleteBestTime: (id: string) => api.delete(`/ai/best-times/${id}`),

  // Objections
  getObjections: (teamId: string) => api.get('/ai/objections', { params: { teamId } }),
  getObjection: (id: string) => api.get(`/ai/objections/${id}`),
  handleObjection: (data: any) => api.post('/ai/objections/handle', data),
  createObjection: (data: any) => api.post('/ai/objections', data),
  updateObjection: (id: string, data: any) => api.put(`/ai/objections/${id}`, data),
  useObjection: (id: string) => api.post(`/ai/objections/${id}/use`),
  deleteObjection: (id: string) => api.delete(`/ai/objections/${id}`),

  // Pipeline Forecasts
  getForecasts: (teamId: string) => api.get('/ai/forecasts', { params: { teamId } }),
  getForecast: (id: string) => api.get(`/ai/forecasts/${id}`),
  generateForecast: (data: any) => api.post('/ai/forecasts/generate', data),
  createForecast: (data: any) => api.post('/ai/forecasts', data),
  updateForecast: (id: string, data: any) => api.put(`/ai/forecasts/${id}`, data),
  deleteForecast: (id: string) => api.delete(`/ai/forecasts/${id}`),
};

// Activity
export const activityAPI = {
  getAll: (params?: any) => api.get('/activity', { params }),
  create: (data: any) => api.post('/activity', data),
  getSummary: (teamId: string) => api.get('/activity/summary', { params: { teamId } }),
};

// Sequences
export const sequencesAPI = {
  getAll: (params?: any) => api.get('/sequences', { params }),
  getById: (id: string) => api.get(`/sequences/${id}`),
  create: (data: any) => api.post('/sequences', data),
  addStep: (id: string, data: any) => api.post(`/sequences/${id}/steps`, data),
  activate: (id: string) => api.post(`/sequences/${id}/activate`),
  pause: (id: string) => api.post(`/sequences/${id}/pause`),
  delete: (id: string) => api.delete(`/sequences/${id}`),
  bulkDelete: (ids: string[]) => api.post('/sequences/bulk-delete', { ids }),
  bulkUpdate: (ids: string[], updates: any) => api.post('/sequences/bulk-update', { ids, updates }),
  exportCSV: (teamId?: string) => api.get('/sequences/export/csv', { params: { teamId }, responseType: 'blob' }),
};

// Meetings
export const meetingsAPI = {
  getAll: (params?: any) => api.get('/meetings', { params }),
  getById: (id: string) => api.get(`/meetings/${id}`),
  create: (data: any) => api.post('/meetings', data),
  update: (id: string, data: any) => api.put(`/meetings/${id}`, data),
  complete: (id: string, data: any) => api.post(`/meetings/${id}/complete`, data),
  cancel: (id: string) => api.post(`/meetings/${id}/cancel`),
  delete: (id: string) => api.delete(`/meetings/${id}`),
  getStats: (teamId: string) => api.get('/meetings/stats/summary', { params: { teamId } }),
  bulkDelete: (ids: string[]) => api.post('/meetings/bulk-delete', { ids }),
  bulkUpdate: (ids: string[], updates: any) => api.post('/meetings/bulk-update', { ids, updates }),
  exportCSV: (teamId?: string) => api.get('/meetings/export/csv', { params: { teamId }, responseType: 'blob' }),
};

// Tasks
export const tasksAPI = {
  getAll: (params?: any) => api.get('/tasks', { params }),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (data: any) => api.post('/tasks', data),
  update: (id: string, data: any) => api.put(`/tasks/${id}`, data),
  complete: (id: string) => api.post(`/tasks/${id}/complete`),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  getStats: (params?: any) => api.get('/tasks/stats/summary', { params }),
  bulkDelete: (ids: string[]) => api.post('/tasks/bulk-delete', { ids }),
  bulkUpdate: (ids: string[], updates: any) => api.post('/tasks/bulk-update', { ids, updates }),
  exportCSV: (teamId?: string) => api.get('/tasks/export/csv', { params: { teamId }, responseType: 'blob' }),
};

// Notifications
export const notificationsAPI = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  getUnreadCount: (userId: string) => api.get('/notifications/unread-count', { params: { userId } }),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: (userId: string) => api.post('/notifications/read-all', { userId }),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  clearRead: (userId: string) => api.delete('/notifications/clear/read', { params: { userId } }),
};

// Reports
export const reportsAPI = {
  getAll: (params?: any) => api.get('/reports', { params }),
  getById: (id: string) => api.get(`/reports/${id}`),
  generate: (data: any) => api.post('/reports/generate', data),
  delete: (id: string) => api.delete(`/reports/${id}`),
};

export default api;
