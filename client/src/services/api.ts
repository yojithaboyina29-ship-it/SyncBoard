const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('syncboard_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const text = await response.text();
    return text as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error || 'An unexpected error occurred', response.status, data.details);
  }

  return data;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<any>('/auth/me'),

  // Workspaces
  getWorkspaces: () => request<{ workspaces: any[] }>('/workspaces'),
  getWorkspace: (id: string) => request<{ workspace: any }>(`/workspaces/${id}`),
  createWorkspace: (body: { name: string }) =>
    request<{ workspace: any }>('/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  inviteMember: (workspaceId: string, body: { email: string; role: string }) =>
    request<any>(`/workspaces/${workspaceId}/invites`, { method: 'POST', body: JSON.stringify(body) }),
  updateMemberRole: (workspaceId: string, memberUserId: string, role: string) =>
    request<any>(`/workspaces/${workspaceId}/members/${memberUserId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (workspaceId: string, memberUserId: string) =>
    request<any>(`/workspaces/${workspaceId}/members/${memberUserId}`, { method: 'DELETE' }),

  // Boards
  createBoard: (body: { workspaceId: string; title: string; description?: string; color?: string }) =>
    request<{ board: any }>('/boards', { method: 'POST', body: JSON.stringify(body) }),
  getBoard: (boardId: string) => request<{ board: any }>(`/boards/${boardId}`),
  updateBoard: (boardId: string, body: any) =>
    request<{ board: any }>(`/boards/${boardId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteBoard: (boardId: string) => request<any>(`/boards/${boardId}`, { method: 'DELETE' }),
  exportBoardCsv: async (boardId: string) => {
    const token = localStorage.getItem('syncboard_token');
    const response = await fetch(`${API_BASE}/boards/${boardId}/export-csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Failed to export CSV');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `board-${boardId}-export.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // Lists
  createList: (body: { boardId: string; title: string; prevPos?: number | null; nextPos?: number | null }) =>
    request<{ list: any }>('/lists', { method: 'POST', body: JSON.stringify(body) }),
  updateList: (listId: string, body: { title: string }) =>
    request<{ list: any }>(`/lists/${listId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  moveList: (listId: string, body: { prevPos?: number | null; nextPos?: number | null }) =>
    request<{ list: any }>(`/lists/${listId}/move`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteList: (listId: string) => request<any>(`/lists/${listId}`, { method: 'DELETE' }),

  // Cards
  createCard: (body: any) => request<{ card: any }>('/cards', { method: 'POST', body: JSON.stringify(body) }),
  updateCard: (cardId: string, body: any) =>
    request<{ card: any }>(`/cards/${cardId}`, { method: 'PATCH', body: JSON.stringify(body) }),
  moveCard: (cardId: string, body: { targetListId: string; prevPos?: number | null; nextPos?: number | null }) =>
    request<{ card: any; position: number; needsRebalance: boolean }>(`/cards/${cardId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteCard: (cardId: string) => request<any>(`/cards/${cardId}`, { method: 'DELETE' }),
  getMyTasks: () => request<{ tasks: any[] }>('/cards/my-tasks'),

  // Comments
  getComments: (cardId: string) => request<{ comments: any[] }>(`/cards/${cardId}/comments`),
  createComment: (cardId: string, content: string) =>
    request<{ comment: any }>(`/cards/${cardId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (commentId: string) => request<any>(`/comments/${commentId}`, { method: 'DELETE' }),

  // Activity
  getBoardActivity: (boardId: string, limit = 30) =>
    request<{ activities: any[]; nextCursor: string | null }>(`/boards/${boardId}/activity?limit=${limit}`),
};
