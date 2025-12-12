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
  book: 'qaidah1' | 'qaidah2' | 'quran';
  page: number;
  marks: QaidahMark[];
}

export interface QaidahClasswork {
  id: string;
  student: string;
  book: 'qaidah1' | 'qaidah2' | 'quran';
  page: number;
  classworkDate: string; // ISO date string
  marks: QaidahMark[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QaidahClassworkList {
  student: string;
  book: 'qaidah1' | 'qaidah2' | 'quran';
  page: number;
  classwork: QaidahClasswork[];
}

/**
 * Fetch marks for a specific Qaidah page
 */
export async function fetchQaidahMarks(
  studentId: string,
  book: 'qaidah1' | 'qaidah2' | 'quran',
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
  book: 'qaidah1' | 'qaidah2' | 'quran',
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

/**
 * Save marks as classwork for a specific date
 */
export async function saveQaidahClasswork(
  studentId: string,
  book: 'qaidah1' | 'qaidah2' | 'quran',
  page: number,
  marks: QaidahMark[],
  classworkDate: Date
): Promise<QaidahClasswork> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/classwork`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentId,
        book,
        page,
        marks,
        classworkDate: classworkDate.toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to save classwork: ${response.statusText}`);
    }

    const data = await response.json();
    return data.classwork;
  } catch (error) {
    console.error(`Error saving qaidah classwork for page ${page}:`, error);
    throw error;
  }
}

/**
 * Fetch all classwork for a student/book/page
 */
export async function fetchQaidahClasswork(
  studentId: string,
  book: 'qaidah1' | 'qaidah2' | 'quran',
  page: number
): Promise<QaidahClassworkList> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/classwork/${studentId}/${book}/${page}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty classwork list if not found
        return {
          student: studentId,
          book,
          page,
          classwork: []
        };
      }
      throw new Error(`Failed to fetch classwork: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      student: data.student || studentId,
      book: data.book || book,
      page: data.page || page,
      classwork: data.classwork || []
    };
  } catch (error) {
    console.error(`Error fetching classwork for page ${page}:`, error);
    // Return empty classwork list on error
    return {
      student: studentId,
      book,
      page,
      classwork: []
    };
  }
}

// ==================== QAIDAH HOMEWORK INTERFACES ====================

export interface QaidahHomework {
  id: string;
  student: string;
  book: 'qaidah1' | 'qaidah2' | 'quran';
  page: number;
  marks: QaidahMark[];
  classworkDate?: string;
  homeworkInstructions: string;
  dueDate: string;
  youtubeLink?: string;
  teacherFeedback?: string;
  status: 'pending' | 'submitted' | 'reviewed';
  assignedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QaidahHomeworkList {
  student: string;
  homework: QaidahHomework[];
}

// ==================== QAIDAH HOMEWORK API ====================

/**
 * Submit homework (student)
 */
export async function submitQaidahHomework(
  homeworkId: string,
  youtubeLink: string
): Promise<QaidahHomework> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/homework/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        homeworkId,
        youtubeLink
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to submit homework: ${response.statusText}`);
    }

    const data = await response.json();
    return data.homework;
  } catch (error) {
    console.error('Error submitting homework:', error);
    throw error;
  }
}

/**
 * Get all homework submissions for a student
 */
export async function fetchQaidahHomeworkSubmissions(
  studentId: string
): Promise<QaidahHomeworkList> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/homework/submissions/${studentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          student: studentId,
          homework: []
        };
      }
      throw new Error(`Failed to fetch homework submissions: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      student: data.student || studentId,
      homework: data.homework || []
    };
  } catch (error) {
    console.error('Error fetching homework submissions:', error);
    return {
      student: studentId,
      homework: []
    };
  }
}

/**
 * Review homework (teacher)
 */
export async function reviewQaidahHomework(
  homeworkId: string,
  teacherFeedback: string,
  status: 'pending' | 'submitted' | 'reviewed' = 'reviewed'
): Promise<QaidahHomework> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/homework/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        homeworkId,
        teacherFeedback,
        status
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to review homework: ${response.statusText}`);
    }

    const data = await response.json();
    return data.homework;
  } catch (error) {
    console.error('Error reviewing homework:', error);
    throw error;
  }
}

/**
 * Assign homework to student (teacher/admin)
 */
/**
 * Fetch available pages for a book
 */
export async function fetchAvailablePages(
  book: 'qaidah1' | 'qaidah2' | 'quran'
): Promise<{ book: string; pages: number[]; totalPages: number }> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/pages/${book}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Return empty pages if not found
        return { book, pages: [], totalPages: 0 };
      }
      throw new Error(`Failed to fetch available pages: ${response.statusText}`);
    }

    const data = await response.json();
    // Extract page numbers from the pages array
    const pageNumbers = (data.pages || []).map((p: any) => p.pageNumber).sort((a: number, b: number) => a - b);
    return {
      book: data.book || book,
      pages: pageNumbers,
      totalPages: pageNumbers.length
    };
  } catch (error) {
    console.error(`Error fetching available pages for ${book}:`, error);
    // Return empty pages on error
    return { book, pages: [], totalPages: 0 };
  }
}

export async function assignQaidahHomework(
  studentId: string,
  book: 'qaidah1' | 'qaidah2' | 'quran',
  page: number,
  dueDate: Date,
  marks?: QaidahMark[],
  classworkDate?: Date,
  homeworkInstructions?: string
): Promise<QaidahHomework> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/qaidah/homework/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        studentId,
        book,
        page,
        marks: marks || [],
        classworkDate: classworkDate?.toISOString(),
        homeworkInstructions: homeworkInstructions || '',
        dueDate: dueDate.toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to assign homework: ${response.statusText}`);
    }

    const data = await response.json();
    return data.homework;
  } catch (error) {
    console.error('Error assigning homework:', error);
    throw error;
  }
}
