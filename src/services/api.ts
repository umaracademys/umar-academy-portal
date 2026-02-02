/**
 * Central API helpers — shared base URL, auth, and endpoint functions.
 * Use these instead of inline fetch + API_BASE in components.
 *
 * Guidelines:
 * - Add new endpoint helpers here (e.g. getStudents, getAssignments, getTickets).
 * - Use getApiBase(), getAuthToken(), getAuthHeaders() for consistent auth and URLs.
 * - Handle loading/error/empty in components with useLoadingState + EmptyState.
 * - All backend endpoints should be wired through this module or BackendDataContext.
 */

export function getApiBase(): string {
  const raw = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export function getAuthToken(): string | null {
  return localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ——— Conversations (unified messaging) ———

export interface ConversationListItem {
  _id: string;
  type: 'teacher_student' | 'pair_teacher';
  participants: Array<{ role: string; userId: string; name: string }>;
  locked: boolean;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  lastMessage?: { body: string; senderName: string; priority: string };
}

export async function getConversations(params?: { type?: string }): Promise<ConversationListItem[]> {
  const base = getApiBase();
  const search = params?.type ? `?type=${encodeURIComponent(params.type)}` : '';
  const res = await fetch(`${base}/conversations${search}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load conversations');
  const data = await res.json();
  return (data.conversations || []).map((conv: any) => ({
    ...conv,
    lastMessage: conv.lastMessageId ? {
      body: conv.lastMessage?.body ?? '',
      senderName: conv.lastMessage?.senderName ?? '',
      priority: conv.lastMessage?.priority ?? 'normal',
    } : undefined,
  }));
}

export interface ConversationStats {
  totalConversations: number;
  activeConversations: number;
  unreadMessages: number;
}

export async function getConversationStats(): Promise<ConversationStats> {
  const base = getApiBase();
  const res = await fetch(`${base}/conversations/admin/stats`, { headers: getAuthHeaders() });
  if (!res.ok) return { totalConversations: 0, activeConversations: 0, unreadMessages: 0 };
  const data = await res.json();
  return {
    totalConversations: data.totalConversations ?? 0,
    activeConversations: data.activeConversations ?? 0,
    unreadMessages: data.unreadMessages ?? 0,
  };
}

export async function lockConversation(conversationId: string, lock: boolean, reason?: string): Promise<void> {
  const base = getApiBase();
  const res = await fetch(`${base}/conversations/${conversationId}/${lock ? 'lock' : 'unlock'}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ reason: reason ?? (lock ? 'Administrative action' : '') }),
  });
  if (!res.ok) throw new Error(lock ? 'Failed to lock conversation' : 'Failed to unlock conversation');
}

// ——— Generic fetch with auth (for use in other helpers) ———

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...(options.headers as Record<string, string>) } });
  return res;
}

// ——— Students ———

/** GET /students — returns array of student records. Use useLoadingState + EmptyState in the UI. */
export async function getStudents(): Promise<any[]> {
  const res = await fetchApi('/students');
  if (!res.ok) throw new Error('Failed to fetch students');
  const data = await res.json();
  return Array.isArray(data) ? data : data.students ?? [];
}

// ——— Assignments ———

/** GET /assignments — optional limit. Returns array of assignments. */
export async function getAssignments(params?: { limit?: number }): Promise<any[]> {
  const search = params?.limit != null ? `?limit=${params.limit}` : '';
  const res = await fetchApi(`/assignments${search}`);
  if (!res.ok) throw new Error('Failed to fetch assignments');
  const data = await res.json();
  return Array.isArray(data) ? data : data.assignments ?? [];
}

/** GET /assignments/me — for student role. Returns array of assignments. */
export async function getAssignmentsMe(): Promise<any[]> {
  const res = await fetchApi('/assignments/me');
  if (!res.ok) throw new Error('Failed to fetch my assignments');
  const data = await res.json();
  return Array.isArray(data) ? data : data.assignments ?? [];
}

// ——— Tickets ———

/** GET /tickets — optional limit. Returns array of tickets. */
export async function getTickets(params?: { limit?: number }): Promise<any[]> {
  const search = params?.limit != null ? `?limit=${params.limit}` : '';
  const res = await fetchApi(`/tickets${search}`);
  if (!res.ok) throw new Error('Failed to fetch tickets');
  const data = await res.json();
  return Array.isArray(data) ? data : data.tickets ?? [];
}

// ——— Teacher attendance ———

/** GET /teacher-attendance — returns list. Shape depends on backend. */
export async function getTeacherAttendance(): Promise<any> {
  const res = await fetchApi('/teacher-attendance');
  if (!res.ok) throw new Error('Failed to fetch teacher attendance');
  return res.json();
}

// ——— Teachers ———

/** GET /teachers — returns array of teachers. Use useLoadingState + EmptyState in the UI. */
export async function getTeachers(): Promise<any[]> {
  const res = await fetchApi('/teachers');
  if (!res.ok) throw new Error('Failed to fetch teachers');
  const data = await res.json();
  return Array.isArray(data) ? data : data.teachers ?? [];
}

// ——— Personal Mushaf ———

/** GET /students/:studentId/personal-mushaf — returns personal mushaf data for a student. */
export async function getPersonalMushaf(studentId: string): Promise<any> {
  const res = await fetchApi(`/students/${encodeURIComponent(studentId)}/personal-mushaf`);
  if (!res.ok) throw new Error('Failed to fetch personal mushaf');
  return res.json();
}
