/**
 * Normalizes list data from API responses that may return either:
 * - Array<T>
 * - { items: T[] }
 * - { items: T[], total, page }
 * - { students: T[] } | { teachers: T[] } | { assignments: T[] } | { tickets: T[] } | etc.
 */
const COMMON_LIST_KEYS = [
  'items',
  'students',
  'teachers',
  'users',
  'assignments',
  'tickets',
  'data',
  'admins',
  'notifications',
] as const;

export function normalizeList<T>(data: unknown, listKey?: string): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;

    if (listKey && Array.isArray(obj[listKey])) {
      return obj[listKey] as T[];
    }

    for (const key of COMMON_LIST_KEYS) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }
  }

  return [];
}

/** Dev-only: log unexpected list shapes before normalization */
export function normalizeListWithGuard<T>(
  data: unknown,
  listKey?: string,
  context?: string
): T[] {
  const list = normalizeList<T>(data, listKey);

  if (
    import.meta.env?.DEV &&
    list.length === 0 &&
    data != null &&
    !Array.isArray(data)
  ) {
    const obj = data as Record<string, unknown>;
    const hasKnownKey = COMMON_LIST_KEYS.some((k) => Array.isArray(obj[k]));
    if (!hasKnownKey) {
      console.warn('[normalizeList] Unexpected list shape:', {
        context: context || 'unknown',
        shape: Array.isArray(data) ? 'array' : typeof data,
        keys: data && typeof data === 'object' ? Object.keys(obj) : [],
      });
    }
  }

  return list;
}
