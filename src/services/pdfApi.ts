// PDF API service functions

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('umar_academy_token') || '';
};

export interface PdfDocument {
  id: string;
  _id?: string;
  title: string;
  filename: string;
  originalFilename: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByName: string;
  description: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PdfAnnotation {
  id: string;
  _id?: string;
  pdfId: string;
  teacherId: string;
  teacherName: string;
  annotations: Array<{
    id: string;
    page: number;
    type: 'highlight' | 'text' | 'drawing' | 'arrow' | 'note';
    x: number;
    y: number;
    width?: number;
    height?: number;
    color: string;
    text?: string;
    note?: string;
    points?: Array<{ x: number; y: number }>;
    createdAt?: string;
  }>;
  notes: string;
  savedAsHomework: boolean;
  assignedToStudents: Array<{
    studentId: string;
    studentName: string;
    assignmentId?: string;
    assignedAt: string;
  }>;
}

// Upload PDF document (Super Admin only)
export async function uploadPdf(
  title: string,
  file: File,
  description?: string,
  tags?: string[]
): Promise<PdfDocument> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const response = await fetch(`${API_BASE}/pdfs/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        fileData: base64Data,
        filename: file.name,
        description: description || '',
        tags: tags || [],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload PDF');
    }

    const data = await response.json();
    return data.pdf;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
}

// Get all PDF documents
export async function getPdfs(activeOnly: boolean = true): Promise<PdfDocument[]> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/pdfs?activeOnly=${activeOnly}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch PDFs');
    }

    const data = await response.json();
    return data.pdfs || [];
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    throw error;
  }
}

// Get single PDF document
export async function getPdf(id: string): Promise<PdfDocument> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/pdfs/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch PDF');
    }

    const data = await response.json();
    return data.pdf;
  } catch (error) {
    console.error('Error fetching PDF:', error);
    throw error;
  }
}

// Delete PDF document (Super Admin only)
export async function deletePdf(id: string): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/pdfs/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete PDF');
    }
  } catch (error) {
    console.error('Error deleting PDF:', error);
    throw error;
  }
}

// Save PDF annotations (Teacher only)
export async function savePdfAnnotations(
  pdfId: string,
  annotations: any[],
  notes: string
): Promise<PdfAnnotation> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/pdfs/${pdfId}/annotations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        annotations,
        notes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save annotations');
    }

    const data = await response.json();
    return data.annotation;
  } catch (error) {
    console.error('Error saving annotations:', error);
    throw error;
  }
}

// Get PDF annotations
export async function getPdfAnnotations(pdfId: string): Promise<PdfAnnotation | null> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/pdfs/${pdfId}/annotations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch annotations');
    }

    const data = await response.json();
    return data.annotation || null;
  } catch (error) {
    console.error('Error fetching annotations:', error);
    throw error;
  }
}

// Assign annotated PDF as homework to student (Teacher only)
export async function assignPdfAsHomework(
  pdfId: string,
  studentId: string,
  studentName: string
): Promise<{ assignmentId: string }> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/pdfs/${pdfId}/annotations/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId,
        studentName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to assign homework');
    }

    const data = await response.json();
    return { assignmentId: data.assignmentId };
  } catch (error) {
    console.error('Error assigning homework:', error);
    throw error;
  }
}

// Get PDF homework assignments for student
export async function getStudentPdfHomework(studentId: string): Promise<Array<{
  assignmentId: string;
  pdf: PdfDocument;
  annotations: any;
  assignedByName: string;
  assignedAt: string;
  status: string;
}>> {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${API_BASE}/students/${studentId}/pdf-homework`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Failed to fetch PDF homework:', response.status, errorData);
      throw new Error(errorData.error || `Failed to fetch PDF homework: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ PDF homework fetched successfully:', data.homework?.length || 0, 'items');
    return data.homework || [];
  } catch (error) {
    console.error('Error fetching PDF homework:', error);
    throw error;
  }
}

