import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Auth API
export const authAPI = {
  login: (username: string, password: string, captchaToken: string) =>
    api.post('/auth/login', { username, password, captcha_token: captchaToken }),

  logout: () => api.post('/auth/logout'),

  register: (data: {
    username: string
    first_name: string
    surname: string
    email: string
    timezone: string
    tournament_winner_id: number
    captcha_token: string
  }) => api.post('/auth/register', data),

  resetPassword: (identifier: string) =>
    api.post('/auth/reset-password', { identifier }),

  getCurrentUser: () => api.get('/auth/me'),

  updateProfile: (data: { first_name?: string; surname?: string; email?: string; timezone?: string; tournament_winner_id?: number | null }) =>
    api.put('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),

  getApiToken: () => api.get('/auth/token'),
  regenerateApiToken: () => api.post('/auth/token/regenerate'),
}

// Games API
export const gamesAPI = {
  getUpcoming: () => api.get('/games/upcoming'),
  getClosed: () => api.get('/games/closed'),
  getGame: (gameId: number) => api.get(`/games/${gameId}`),
}

// Predictions API
export const predictionsAPI = {
  getPredictions: () => api.get('/predictions/'),
  createPrediction: (data: {
    game_id: number
    team_a_score: number
    team_b_score: number
  }) => api.post('/predictions/', data),
  getGamePredictions: (gameId: number) => api.get(`/predictions/${gameId}`),
}

// Rankings API
export const rankingsAPI = {
  getOverall: () => api.get('/rankings/overall'),
  getRound: (roundId: number) => api.get(`/rankings/round/${roundId}`),
  getHistory: (userId: number, roundId?: number) => {
    const params = roundId ? `?round_id=${roundId}` : ''
    return api.get(`/rankings/history/${userId}${params}`)
  },
  getRounds: () => api.get('/rankings/rounds'),
}

// Players API
export const playersAPI = {
  getAll: () => api.get('/players/'),
  getPlayer: (userId: number) => api.get(`/players/${userId}`),
  getPlayerPredictions: (userId: number) => api.get(`/players/${userId}/predictions`),
  getWinnerPredictions: () => api.get('/players/winner-predictions'),
}

// News API
export const newsAPI = {
  getAll: () => api.get('/news/'),
  getOne: (newsId: number) => api.get(`/news/${newsId}`),
  create: (data: { title: string; content: string; image_url?: string }) =>
    api.post('/news/', data),
  update: (newsId: number, data: Partial<{ title: string; content: string; image_url?: string }>) =>
    api.put(`/news/${newsId}`, data),
  delete: (newsId: number) => api.delete(`/news/${newsId}`),
  react: (newsId: number, reactionType: 'like' | 'dislike') =>
    api.post(`/news/${newsId}/react`, { reaction_type: reactionType }),
  getComments: (newsId: number) => api.get(`/news/${newsId}/comments`),
  addComment: (newsId: number, content: string) =>
    api.post(`/news/${newsId}/comments`, { content }),
  deleteComment: (commentId: number) => api.delete(`/news/comments/${commentId}`),
}

// Admin API
export const adminAPI = {
  // Users & payments
  getUsers: () => api.get('/admin/users'),
  recordPayment: (userId: number) => api.post(`/admin/payment/${userId}`),
  removePayment: (userId: number) => api.delete(`/admin/payment/${userId}`),
  deleteUser: (userId: number) => api.delete(`/admin/users/${userId}`),
  updateUserRole: (userId: number, roles: { is_admin?: boolean; is_cachier?: boolean; is_player?: boolean }) =>
    api.put(`/admin/users/${userId}/role`, roles),

  // Score entry
  getGames: () => api.get('/admin/games'),
  enterScore: (gameId: number, data: { team_a_score: number; team_b_score: number }) =>
    api.post(`/admin/score/${gameId}`, data),
  rollbackScore: (gameId: number) => api.delete(`/admin/score/${gameId}`),

  // Tournament winner
  getTournamentWinner: () => api.get('/admin/tournament-winner'),
  setTournamentWinner: (winnerTeamId: number) =>
    api.post('/admin/tournament-winner', { winner_team_id: winnerTeamId }),
  rollbackTournamentWinner: () => api.delete('/admin/tournament-winner'),

  // News management
  getNews: () => api.get('/admin/news'),
  createNews: (data: { title: string; content: string; image_url?: string }) =>
    api.post('/admin/news', data),
  updateNews: (newsId: number, data: { title?: string; content?: string; image_url?: string }) =>
    api.put(`/admin/news/${newsId}`, data),
  deleteNews: (newsId: number) => api.delete(`/admin/news/${newsId}`),

  // Datetime override
  getDatetimeOverride: () => api.get('/admin/datetime-override'),
  setDatetimeOverride: (datetime: string) => api.post('/admin/datetime-override', { datetime }),
  clearDatetimeOverride: () => api.delete('/admin/datetime-override'),

  // Full reset
  resetAll: () => api.delete('/admin/reset-all', { data: { confirmation: 'RESET ALL' } }),

  // AI daily limit
  getAiLimit: () => api.get('/admin/ai-limit'),
  setAiLimit: (limit: number) => api.post('/admin/ai-limit', { limit }),
}

// Teams API
export const teamsAPI = {
  getAll: () => api.get('/teams/'),
}

export default api
