import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PageInfo {
  pageNumber: number;
  filename: string;
  size: number;
  url: string;
  uploadedAt: string;
}

interface BookPages {
  book: string;
  pages: PageInfo[];
  totalPages: number;
}

interface FileToUpload {
  file: File;
  pageNumber: number | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const QaidahUploadManager: React.FC = () => {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<'qaidah1' | 'qaidah2' | 'quran'>('qaidah1');
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [filesToUpload, setFilesToUpload] = useState<FileToUpload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);

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

  // Load pages for selected book
  const loadPages = async () => {
    if (user?.role !== 'superadmin') return;

    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/qaidah/pages/${selectedBook}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load pages: ${response.status}`);
      }

      const data: BookPages = await response.json();
      setPages(data.pages || []);
    } catch (error: any) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [selectedBook, user]);

  // Extract page number from filename
  const extractPageNumber = (filename: string): number | null => {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Handle file selection
  const handleFileSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList) as File[];
    const newFiles: FileToUpload[] = files.map(file => ({
      file,
      pageNumber: extractPageNumber(file.name),
      status: 'pending' as const,
    }));

    if (uploadMode === 'single') {
      setFilesToUpload([newFiles[0]]);
    } else {
      setFilesToUpload(prev => [...prev, ...newFiles]);
    }
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

  // Remove file from upload list
  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Update page number for a file
  const updatePageNumber = (index: number, pageNumber: number) => {
    setFilesToUpload(prev => prev.map((f, i) => 
      i === index ? { ...f, pageNumber } : f
    ));
  };

  // Upload all files
  const handleUpload = async () => {
    if (filesToUpload.length === 0) return;

    // Validate all files have page numbers
    const invalidFiles = filesToUpload.filter(f => !f.pageNumber || f.pageNumber < 1);
    if (invalidFiles.length > 0) {
      alert('Please set page numbers for all files');
      return;
    }

    setUploading(true);
    const token = getAuthToken();

    // Update all to uploading
    setFilesToUpload(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

    const results = await Promise.allSettled(
      filesToUpload.map(async (fileToUpload, index) => {
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(fileToUpload.file);
          });

          const response = await fetch(`${API_BASE}/qaidah/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              book: selectedBook,
              pageNumber: fileToUpload.pageNumber,
              fileData: base64Data,
              filename: fileToUpload.file.name,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
          }

          // Update to success
          setFilesToUpload(prev => prev.map((f, i) => 
            i === index ? { ...f, status: 'success' as const } : f
          ));

          return { success: true, index };
        } catch (error: any) {
          // Update to error
          setFilesToUpload(prev => prev.map((f, i) => 
            i === index ? { ...f, status: 'error' as const, error: error.message } : f
          ));
          return { success: false, index, error: error.message };
        }
      })
    );

    // Wait a bit to show success states, then reload pages and clear
    setTimeout(() => {
      loadPages();
      setFilesToUpload([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (filesInputRef.current) filesInputRef.current.value = '';
    }, 2000);

    setUploading(false);
  };

  // Delete page
  const handleDelete = async (pageNum: number) => {
    if (!confirm(`Delete page ${pageNum}?`)) return;

    try {
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/qaidah/pages/${selectedBook}/${pageNum}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Delete failed');
      loadPages();
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

  const successCount = filesToUpload.filter(f => f.status === 'success').length;
  const errorCount = filesToUpload.filter(f => f.status === 'error').length;
  const pendingCount = filesToUpload.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📚 Book Upload Manager</h1>
        <p className="text-primary-100">Upload and manage Qaidah and Quran pages</p>
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
                setFilesToUpload([]);
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
          <h2 className="text-xl font-bold text-gray-800">Upload Pages</h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setUploadMode('single');
                setFilesToUpload([]);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                uploadMode === 'single'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => {
                setUploadMode('bulk');
                setFilesToUpload([]);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                uploadMode === 'bulk'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              📁 Bulk
            </button>
          </div>
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
          <p className="text-sm text-gray-500 mb-4">JPG or PNG (MAX. 10MB per file)</p>
          <input
            ref={uploadMode === 'single' ? fileInputRef : filesInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple={uploadMode === 'bulk'}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id={`file-input-${uploadMode}`}
          />
          <label
            htmlFor={`file-input-${uploadMode}`}
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
          >
            Choose {uploadMode === 'single' ? 'File' : 'Files'}
          </label>
        </div>

        {/* Files to Upload List */}
        {filesToUpload.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              Files to Upload ({filesToUpload.length})
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filesToUpload.map((fileToUpload, index) => (
                <div
                  key={index}
                  className={`bg-white rounded-lg p-4 border-2 ${
                    fileToUpload.status === 'success' ? 'border-green-500' :
                    fileToUpload.status === 'error' ? 'border-red-500' :
                    fileToUpload.status === 'uploading' ? 'border-blue-500' :
                    'border-gray-200'
                  }`}
                >
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
                      <div className="mt-2 flex items-center gap-2">
                        <label className="text-xs text-gray-600">Page Number:</label>
                        <input
                          type="number"
                          min="1"
                          value={fileToUpload.pageNumber || ''}
                          onChange={(e) => {
                            const pageNum = parseInt(e.target.value, 10);
                            if (!isNaN(pageNum) && pageNum > 0) {
                              updatePageNumber(index, pageNum);
                            } else {
                              updatePageNumber(index, null as any);
                            }
                          }}
                          disabled={fileToUpload.status === 'uploading' || fileToUpload.status === 'success'}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Auto"
                        />
                        {fileToUpload.pageNumber === null && (
                          <span className="text-xs text-amber-600">
                            ⚠️ Set page number
                          </span>
                        )}
                      </div>
                    </div>
                    {(fileToUpload.status === 'pending' || fileToUpload.status === 'error') && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {pendingCount > 0 && <span>{pendingCount} pending</span>}
                {successCount > 0 && <span className="ml-2 text-green-600">{successCount} uploaded</span>}
                {errorCount > 0 && <span className="ml-2 text-red-600">{errorCount} failed</span>}
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || filesToUpload.length === 0 || pendingCount === 0}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : `Upload ${pendingCount} File(s)`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Pages List */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {bookNames[selectedBook]} Pages
            </h2>
            <p className="text-sm text-gray-500 mt-1">{pages.length} page(s) uploaded</p>
          </div>
          <button
            onClick={loadPages}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 font-medium"
          >
            {loading ? 'Loading...' : '🔄 Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg font-medium">No pages uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload your first page above</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-400">{page.pageNumber}</span>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">Page {page.pageNumber}</p>
                  <button
                    onClick={() => handleDelete(page.pageNumber)}
                    className="mt-2 text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QaidahUploadManager;
