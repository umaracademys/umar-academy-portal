import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PdfInfo {
  filename: string;
  size: number;
  url: string;
  uploadedAt: string;
}

interface BookPdf {
  book: string;
  pdf: PdfInfo | null;
}

interface FileToUpload {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const QaidahUploadManager: React.FC = () => {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<'qaidah1' | 'qaidah2' | 'quran'>('qaidah1');
  const [fileToUpload, setFileToUpload] = useState<FileToUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get API base URL
  const getApiBase = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
    return base.endsWith('/api') ? base : `${base}/api`;
  };

  const API_BASE = getApiBase();

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('umar_academy_token') || '';
  };

  // Load PDF for selected book
  const loadPdf = async () => {
    if (user?.role !== 'superadmin') return;

    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/qaidah/pdf/${selectedBook}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setPdfInfo(null);
          return;
        }
        throw new Error(`Failed to load PDF: ${response.status}`);
      }

      const data: BookPdf = await response.json();
      setPdfInfo(data.pdf || null);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      setPdfInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPdf();
  }, [selectedBook, user]);

  // Handle file selection (only PDF files)
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0] as File;
    
    // Validate PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file');
      return;
    }

    setFileToUpload({
      file,
      status: 'pending' as const,
    });
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Remove file from upload
  const removeFile = () => {
    setFileToUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload PDF
  const handleUpload = async () => {
    if (!fileToUpload) return;

    setUploading(true);
    const token = getAuthToken();

    // Update to uploading
    setFileToUpload(prev => prev ? { ...prev, status: 'uploading' as const } : null);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileToUpload.file);
      });

      const response = await fetch(`${API_BASE}/qaidah/upload-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          book: selectedBook,
          fileData: base64Data,
          filename: fileToUpload.file.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      // Update to success
      setFileToUpload(prev => prev ? { ...prev, status: 'success' as const } : null);

      // Wait a bit to show success, then reload and clear
      setTimeout(() => {
        loadPdf();
        setFileToUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2000);
    } catch (error: any) {
      // Update to error
      setFileToUpload(prev => prev ? { ...prev, status: 'error' as const, error: error.message } : null);
    } finally {
      setUploading(false);
    }
  };

  // Delete PDF
  const handleDelete = async () => {
    if (!confirm(`Delete PDF for ${bookNames[selectedBook]}?`)) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/qaidah/pdf/${selectedBook}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');
      loadPdf();
    } catch (error: any) {
      alert(error.message || 'Delete failed');
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md">
        <p className="text-red-600">Access denied. Super admin only.</p>
      </div>
    );
  }

  const bookNames = {
    qaidah1: 'Qaidah 1',
    qaidah2: 'Qaidah 2',
    quran: 'Quran'
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📚 Book Upload Manager</h1>
        <p className="text-primary-100">Upload and manage Qaidah and Quran PDFs</p>
      </div>

      {/* Book Selection */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Book</label>
        <div className="grid grid-cols-3 gap-3">
          {(['qaidah1', 'qaidah2', 'quran'] as const).map((book) => (
            <button
              key={book}
              onClick={() => {
                setSelectedBook(book);
                setFileToUpload(null);
              }}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                selectedBook === book
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {bookNames[book]}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Upload PDF</h2>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-gray-600 mb-2">
            <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
          </p>
          <p className="text-sm text-gray-500 mb-4">PDF file (MAX. 50MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="pdf-file-input"
          />
          <label
            htmlFor="pdf-file-input"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
          >
            Choose PDF File
          </label>
        </div>

        {/* File to Upload */}
        {fileToUpload && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">File to Upload</h3>
            <div className={`bg-white rounded-lg p-4 border-2 ${
              fileToUpload.status === 'success' ? 'border-green-500' :
              fileToUpload.status === 'error' ? 'border-red-500' :
              fileToUpload.status === 'uploading' ? 'border-blue-500' :
              'border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      {fileToUpload.file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(fileToUpload.file.size)}
                    </span>
                    {fileToUpload.status === 'uploading' && (
                      <span className="text-xs text-blue-600">⏳ Uploading...</span>
                    )}
                    {fileToUpload.status === 'success' && (
                      <span className="text-xs text-green-600">✅ Uploaded</span>
                    )}
                    {fileToUpload.status === 'error' && (
                      <span className="text-xs text-red-600">❌ {fileToUpload.error}</span>
                    )}
                  </div>
                </div>
                {(fileToUpload.status === 'pending' || fileToUpload.status === 'error') && (
                  <button
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading || fileToUpload.status !== 'pending'}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : 'Upload PDF'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded PDF */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {bookNames[selectedBook]} PDF
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {pdfInfo ? 'PDF uploaded' : 'No PDF uploaded'}
            </p>
          </div>
          <button
            onClick={loadPdf}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF info...</p>
          </div>
        ) : !pdfInfo ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg font-medium">No PDF uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload a PDF file above</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-semibold text-gray-800">
                    📄 {pdfInfo.filename}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Size: {formatFileSize(pdfInfo.size)}</p>
                  <p>Uploaded: {new Date(pdfInfo.uploadedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Delete PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QaidahUploadManager;
