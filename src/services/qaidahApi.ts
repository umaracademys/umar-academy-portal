// Qaidah API Service
// Handle API calls for Qaidah marking functionality
const getApiBase = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  return base.endsWith('/api') ? base : `${base}/api`;
};

const API_BASE = getApiBase();

// Get authentication token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('umar_academy_token');
};

export interface QaidahMark {
  id: string;
  type: 'mistake' | 'correct' | 'note';
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  comment?: string;
}

export interface QaidahMarkData {
  student: string;
  book: 'qaidah1' | 'qaidah2';
  page: number;
  marks: QaidahMark[];
}

/**
 * Fetch marks for a specific Qaidah page
 */
export async function fetchQaidahMarks(
  studentId: string,
  book: 'qaidah1' | 'qaidah2',
  page: number
): Promise<QaidahMarkData> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/${studentId}/${book}/${page}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty marks if page not found
        return {
          student: studentId,
          book,
          page,
          marks: []
        };
      }
      throw new Error(`Failed to fetch qaidah marks: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      student: data.student || studentId,
      book: data.book || book,
      page: data.page || page,
      marks: data.marks || []
    };
  } catch (error) {
    console.error(`Error fetching qaidah marks for page ${page}:`, error);
    // Return empty marks on error
    return {
      student: studentId,
      book,
      page,
      marks: []
    };
  }
}

/**
 * Save marks for a Qaidah page
 */
export async function saveQaidahMarks(
  studentId: string,
  book: 'qaidah1' | 'qaidah2',
  page: number,
  marks: QaidahMark[]
): Promise<QaidahMarkData> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentId,
        book,
        page,
        marks
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to save qaidah marks: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      student: data.student || studentId,
      book: data.book || book,
      page: data.page || page,
      marks: data.marks || []
    };
  } catch (error) {
    console.error(`Error saving qaidah marks for page ${page}:`, error);
    throw error;
  }
}
