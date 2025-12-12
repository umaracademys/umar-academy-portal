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

const QaidahUploadManager: React.FC = () => {
  const { user } = useAuth();
  const [selectedBook, setSelectedBook] = useState<'qaidah1' | 'qaidah2' | 'quran'>('qaidah1');
  const [pageNumber, setPageNumber] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
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
      setUploadError(null);
      const token = getAuthToken();
      const response = await fetch(`${API_BASE}/qaidah/pages/${selectedBook}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to load pages: ${response.status} ${response.statusText}`);
      }

      const data: BookPages = await response.json();
      setPages(data.pages || []);
    } catch (error: any) {
      console.error('Error loading pages:', error);
      setUploadError(error.message || 'Failed to load pages. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [selectedBook, user]);

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

    const files = Array.from(e.dataTransfer.files) as File[];
    if (uploadMode === 'single') {
      if (files.length > 0) {
        handleFileValidation(files[0], true);
      }
    } else {
      handleFilesValidation(files);
    }
  };

  // Handle single file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileValidation(file, false);
    }
  };

  const handleFileValidation = (file: File, fromDrag: boolean) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Invalid file type. Please select a JPG or PNG image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    if (!fromDrag && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle multiple file selection
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList) as File[];
    handleFilesValidation(files);
  };

  const handleFilesValidation = (files: File[]) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles: string[] = [];
    const tooLargeFiles: string[] = [];

    files.forEach((file: File) => {
      if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(file.name);
      }
      if (file.size > 10 * 1024 * 1024) {
        tooLargeFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      setUploadError(`Invalid file types: ${invalidFiles.join(', ')}. Only JPG/PNG allowed.`);
      return;
    }

    if (tooLargeFiles.length > 0) {
      setUploadError(`Files too large (max 10MB): ${tooLargeFiles.join(', ')}`);
      return;
    }

    setSelectedFiles(files);
    setUploadError(null);
  };

  // Extract page number from filename
  const extractPageNumber = (filename: string): number | null => {
    const match = filename.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  // Handle bulk upload
  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);
      setUploadProgress({ current: 0, total: selectedFiles.length });

      const token = getAuthToken();
      const results: { success: boolean; filename: string; pageNumber?: number; error?: string }[] = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });

        try {
          let pageNum = extractPageNumber(file.name);
          
          if (!pageNum) {
            results.push({
              success: false,
              filename: file.name,
              error: 'Could not extract page number from filename. Please rename file to include a number (e.g., "1.jpg", "page_2.png")',
            });
            failCount++;
            continue;
          }

          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const response = await fetch(`${API_BASE}/qaidah/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              book: selectedBook,
              pageNumber: pageNum,
              fileData: base64Data,
              filename: file.name,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || `Upload failed: ${response.status} ${response.statusText}`);
          }

          results.push({
            success: true,
            filename: file.name,
            pageNumber: pageNum,
          });
          successCount++;
        } catch (error: any) {
          results.push({
            success: false,
            filename: file.name,
            error: error.message || 'Upload failed',
          });
          failCount++;
        }
      }

      if (successCount > 0 && failCount === 0) {
        setUploadSuccess(`✅ Successfully uploaded ${successCount} page(s)!`);
      } else if (successCount > 0 && failCount > 0) {
        setUploadSuccess(`⚠️ Uploaded ${successCount} page(s), ${failCount} failed.`);
        const failedFiles = results.filter(r => !r.success).map(r => `${r.filename}: ${r.error}`).join('\n');
        setUploadError(`Failed files:\n${failedFiles}`);
      } else {
        setUploadError(`❌ All uploads failed.`);
      }

      setSelectedFiles([]);
      if (filesInputRef.current) filesInputRef.current.value = '';

      await loadPages();
    } catch (error: any) {
      setUploadError(error.message || 'Bulk upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // Handle single file upload
  const handleUpload = async () => {
    if (!selectedFile || !pageNumber) {
      setUploadError('Please select a file and enter a page number.');
      return;
    }

    const pageNum = parseInt(pageNumber, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      setUploadError('Please enter a valid page number (1 or higher).');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const token = getAuthToken();

          const response = await fetch(`${API_BASE}/qaidah/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              book: selectedBook,
              pageNumber: pageNum,
              fileData: base64Data,
              filename: selectedFile.name,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || `Upload failed: ${response.status} ${response.statusText}`);
          }

          setUploadSuccess(`✅ Page ${pageNum} uploaded successfully!`);
          setSelectedFile(null);
          setPageNumber('');
          setUploadError(null);
          if (fileInputRef.current) fileInputRef.current.value = '';

          await loadPages();
        } catch (error: any) {
          setUploadError(error.message || 'Upload failed');
        } finally {
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setUploadError('Failed to read file');
        setUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (error: any) {
      setUploadError(error.message || 'Upload failed');
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (pageNum: number) => {
    if (!confirm(`Are you sure you want to delete page ${pageNum}?`)) {
      return;
    }

    try {
      setDeleting(pageNum);
      const token = getAuthToken();

      const response = await fetch(`${API_BASE}/qaidah/pages/${selectedBook}/${pageNum}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      await loadPages();
    } catch (error: any) {
      alert(error.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md border border-red-200">
        <p className="text-red-600 font-medium">Access denied. Only super admins can manage book pages.</p>
      </div>
    );
  }

  const bookNames = {
    qaidah1: 'Qaidah 1',
    qaidah2: 'Qaidah 2',
    quran: 'Quran'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">📚 Book Upload Manager</h1>
            <p className="text-primary-100">Upload and manage Qaidah and Quran pages</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <div className="text-sm text-primary-100">Total Pages</div>
              <div className="text-2xl font-bold">{pages.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Book Selection Card */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Select Book
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(['qaidah1', 'qaidah2', 'quran'] as const).map((book) => (
            <button
              key={book}
              onClick={() => setSelectedBook(book)}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                selectedBook === book
                  ? 'bg-primary-600 text-white shadow-md transform scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {bookNames[book]}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Upload Pages</h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => {
                setUploadMode('single');
                setSelectedFile(null);
                setSelectedFiles([]);
                setPageNumber('');
                setUploadError(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                uploadMode === 'single'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => {
                setUploadMode('bulk');
                setSelectedFile(null);
                setSelectedFiles([]);
                setPageNumber('');
                setUploadError(null);
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                uploadMode === 'bulk'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📁 Bulk
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          }`}
        >
          {uploadMode === 'single' ? (
            <>
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-gray-600 mb-2">
                <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500 mb-4">JPG or PNG (MAX. 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
              >
                Choose File
              </label>
              {selectedFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                    </div>
                    <span className="text-xs text-green-600">{(selectedFile.size / 1024).toFixed(2)} KB</span>
                  </div>
                </div>
              )}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Page Number</label>
                <input
                  type="number"
                  min="1"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="Enter page number (e.g., 1, 2, 3...)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </>
          ) : (
            <>
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-gray-600 mb-2">
                <span className="font-semibold text-primary-600">Click to upload</span> or drag and drop multiple files
              </p>
              <p className="text-sm text-gray-500 mb-4">JPG or PNG files (MAX. 10MB each)</p>
              <input
                ref={filesInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFilesSelect}
                className="hidden"
                id="files-input"
              />
              <label
                htmlFor="files-input"
                className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors"
              >
                Choose Files
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-3">
                    {selectedFiles.length} file(s) selected
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => {
                      const extractedPage = extractPageNumber(file.name);
                      return (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded text-sm">
                          <span className="text-gray-700 truncate flex-1">{file.name}</span>
                          <div className="flex items-center gap-3 ml-2">
                            <span className="text-gray-500">{(file.size / 1024).toFixed(2)} KB</span>
                            {extractedPage && (
                              <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium">
                                Page {extractedPage}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-blue-600">
                    💡 Files with numbers in their names will automatically use that number as the page number.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress Bar */}
        {uploading && uploadProgress && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Uploading...</span>
              <span className="text-sm text-gray-500">{uploadProgress.current} / {uploadProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Messages */}
        {uploadError && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 whitespace-pre-line">{uploadError}</p>
              </div>
            </div>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-4 p-4 bg-green-50 border-l-4 border-green-400 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-green-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-medium text-green-800">{uploadSuccess}</p>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6">
          {uploadMode === 'single' ? (
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !pageNumber}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload Page'
              )}
            </button>
          ) : (
            <button
              onClick={handleBulkUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-md"
            >
              {uploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Uploading {uploadProgress ? `${uploadProgress.current}/${uploadProgress.total}` : ''}...
                </span>
              ) : (
                `Upload ${selectedFiles.length} Page(s)`
              )}
            </button>
          )}
        </div>
      </div>

      {/* Pages List */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
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
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              '🔄 Refresh'
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No pages uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload your first page to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Page #</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Filename</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.pageNumber} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-800">
                        {page.pageNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{page.filename}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatFileSize(page.size)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(page.uploadedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(page.pageNumber)}
                        disabled={deleting === page.pageNumber}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 font-medium transition-colors"
                      >
                        {deleting === page.pageNumber ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Deleting...
                          </span>
                        ) : (
                          '🗑️ Delete'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QaidahUploadManager;
