import React, { useState, useEffect } from 'react';
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

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token') || '';
  };

  // Load pages for selected book
  const loadPages = async () => {
    if (user?.role !== 'superadmin') return;

    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`/api/qaidah/pages/${selectedBook}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load pages');
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

  // Handle single file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Please select a JPG or PNG image.');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setUploadError('File size too large. Maximum size is 10MB.');
        return;
      }

      setSelectedFile(file);
      setUploadError(null);
    }
  };

  // Handle multiple file selection (folder upload)
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles: string[] = [];
    const tooLargeFiles: string[] = [];

    files.forEach(file => {
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
    // Try to find a number in the filename
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

      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length });

        try {
          // Extract page number from filename
          let pageNum = extractPageNumber(file.name);
          
          // If no page number found in filename, skip this file
          if (!pageNum) {
            results.push({
              success: false,
              filename: file.name,
              error: 'Could not extract page number from filename. Please rename file to include a number (e.g., "1.jpg", "page_2.png")',
            });
            failCount++;
            continue;
          }

          // Convert file to base64
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const response = await fetch('/api/qaidah/upload', {
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
            throw new Error(data.error || 'Upload failed');
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

      // Show results
      if (successCount > 0 && failCount === 0) {
        setUploadSuccess(`Successfully uploaded ${successCount} page(s)!`);
      } else if (successCount > 0 && failCount > 0) {
        setUploadSuccess(`Uploaded ${successCount} page(s), ${failCount} failed. Check errors below.`);
        const failedFiles = results.filter(r => !r.success).map(r => `${r.filename}: ${r.error}`).join('\n');
        setUploadError(`Failed files:\n${failedFiles}`);
      } else {
        setUploadError(`All uploads failed. Check errors above.`);
      }

      // Clear selections
      setSelectedFiles([]);
      const fileInput = document.getElementById('files-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      // Reload pages
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

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const token = getAuthToken();

          const response = await fetch('/api/qaidah/upload', {
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
            throw new Error(data.error || 'Upload failed');
          }

          setUploadSuccess(`Page ${pageNum} uploaded successfully!`);
          setSelectedFile(null);
          setPageNumber('');
          // Reset file input
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          if (fileInput) fileInput.value = '';

          // Reload pages
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

      const response = await fetch(`/api/qaidah/pages/${selectedBook}/${pageNum}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Delete failed');
      }

      // Reload pages
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
    return new Date(dateString).toLocaleDateString();
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <p className="text-red-600">Access denied. Only super admins can manage book pages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📚 Book Page Upload Manager</h2>
        <p className="text-gray-600 mb-6">Upload and manage Qaidah and Quran pages</p>

        {/* Book Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Book
          </label>
          <select
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value as 'qaidah1' | 'qaidah2' | 'quran')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="qaidah1">Qaidah 1</option>
            <option value="qaidah2">Qaidah 2</option>
            <option value="quran">Quran</option>
          </select>
        </div>

        {/* Upload Form */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Upload Pages</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setUploadMode('single');
                  setSelectedFile(null);
                  setSelectedFiles([]);
                  setPageNumber('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'single'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Single Upload
              </button>
              <button
                onClick={() => {
                  setUploadMode('bulk');
                  setSelectedFile(null);
                  setSelectedFiles([]);
                  setPageNumber('');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  uploadMode === 'bulk'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📁 Folder/Bulk Upload
              </button>
            </div>
          </div>

          {uploadMode === 'single' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Number
                </label>
                <input
                  type="number"
                  min="1"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g., 1, 2, 3..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image File (JPG/PNG, max 10MB)
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {selectedFile && (
                  <p className="mt-2 text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Multiple Files or Folder (JPG/PNG, max 10MB each)
              </label>
              <input
                id="files-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handleFilesSelect}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {selectedFiles.length} file(s) selected:
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => {
                      // Try to extract page number from filename
                      const pageMatch = file.name.match(/(\d+)/);
                      const extractedPage = pageMatch ? parseInt(pageMatch[1], 10) : null;
                      return (
                        <div key={index} className="flex items-center justify-between text-sm text-gray-600 bg-white p-2 rounded">
                          <span>{file.name}</span>
                          <span className="text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB
                            {extractedPage && ` → Page ${extractedPage}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    💡 Tip: Files with numbers in their names (e.g., "1.jpg", "page_2.png") will automatically use that number as the page number.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error/Success Messages */}
          {uploadError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {uploadSuccess}
            </div>
          )}

          {uploadMode === 'single' ? (
            <button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !pageNumber}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Uploading...' : 'Upload Page'}
            </button>
          ) : (
            <button
              onClick={handleBulkUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading
                ? uploadProgress
                  ? `Uploading... ${uploadProgress.current}/${uploadProgress.total}`
                  : 'Uploading...'
                : `Upload ${selectedFiles.length} Page(s)`}
            </button>
          )}
        </div>
      </div>

      {/* Existing Pages List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Existing Pages ({selectedBook === 'qaidah1' ? 'Qaidah 1' : selectedBook === 'qaidah2' ? 'Qaidah 2' : 'Quran'})
          </h3>
          <button
            onClick={loadPages}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No pages uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pages.map((page) => (
                  <tr key={page.pageNumber} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {page.pageNumber}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {page.filename}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatFileSize(page.size)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(page.uploadedAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(page.pageNumber)}
                        disabled={deleting === page.pageNumber}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {deleting === page.pageNumber ? 'Deleting...' : 'Delete'}
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
