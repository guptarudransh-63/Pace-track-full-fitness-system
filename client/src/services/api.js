const BASE_URL = '/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes HttpOnly cookies
  });

  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  updatePreferences: (body) => request('/auth/preferences', { method: 'PATCH', body: JSON.stringify(body) }),

  // Activities
  getFeed: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/social/feed${query ? `?${query}` : ''}`);
  },
  getActivity: (id) => request(`/activities/${id}`),
  getActivityRoute: (id) => request(`/activities/${id}/route`),
  getActivitySplits: (id) => request(`/activities/${id}/splits`),
  getActivitySegments: (id) => request(`/activities/${id}/segments`),
  uploadGpx: (formData) => request('/activities/upload', { method: 'POST', body: formData }),
  createManualActivity: (body) => request('/activities/manual', { method: 'POST', body: JSON.stringify(body) }),
  updateActivity: (id, body) => request(`/activities/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteActivity: (id) => request(`/activities/${id}`, { method: 'DELETE' }),
  getUserActivities: (userId) => request(`/activities/user/${userId}`),

  // Social
  toggleFollow: (userId) => request(`/social/follow/${userId}`, { method: 'POST' }),
  toggleKudos: (activityId) => request(`/social/activities/${activityId}/kudos`, { method: 'POST' }),
  getKudosList: (activityId) => request(`/social/activities/${activityId}/kudos`),
  addComment: (activityId, text) =>
    request(`/social/activities/${activityId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  getComments: (activityId) => request(`/social/activities/${activityId}/comments`),

  // Segments
  getSegments: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/segments${query ? `?${query}` : ''}`);
  },
  getSegment: (id) => request(`/segments/${id}`),
  getSegmentLeaderboard: (id, filter = 'all') => request(`/segments/${id}/leaderboard?filter=${filter}`),
  createSegment: (body) => request('/segments', { method: 'POST', body: JSON.stringify(body) }),

  // Clubs
  getClubs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/clubs${query ? `?${query}` : ''}`);
  },
  getClub: (id) => request(`/clubs/${id}`),
  createClub: (body) => request('/clubs', { method: 'POST', body: JSON.stringify(body) }),
  joinClub: (id) => request(`/clubs/${id}/join`, { method: 'POST' }),
  leaveClub: (id) => request(`/clubs/${id}/leave`, { method: 'POST' }),
  getClubLeaderboard: (id) => request(`/clubs/${id}/leaderboard`),
  getClubMembers: (id) => request(`/clubs/${id}/members`),

  // Goals
  getGoals: () => request('/goals'),
  createGoal: (body) => request('/goals', { method: 'POST', body: JSON.stringify(body) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: 'DELETE' }),

  // Analytics
  getDashboardAnalytics: (days = 30) => request(`/analytics/dashboard?days=${days}`),
  getAthleteStats: (userId) => request(`/analytics/athlete${userId ? `/${userId}` : ''}`),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),

  // Search
  search: (q, type = 'all') => request(`/search?q=${encodeURIComponent(q)}&type=${type}`),
};
