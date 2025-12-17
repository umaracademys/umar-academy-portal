import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadPdf, getPdfs, deletePdf, PdfDocument } from '../services/pdfApi';

const PdfManagement: React.FC = () => {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<PdfDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    loadPdfs();
  }, []);

  const loadPdfs = async () => {
    try {
      setLoading(true);
      const pdfList = await getPdfs(true);
      setPdfs(pdfList);
    } catch (error) {
      console.error('Error loading PDFs:', error);
      alert('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace('.pdf', ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      alert('Please select a file and enter a title');
      return;
    }

    try {
      setUploading(true);
      await uploadPdf(title, selectedFile, description);
      alert('PDF uploaded successfully!');
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setShowUploadForm(false);
      loadPdfs();
    } catch (error: any) {
      console.error('Error uploading PDF:', error);
      alert(error.message || 'Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete PDF "${title}"? This will also delete all associated annotations.`)) {
      return;
    }

    try {
      await deletePdf(id);
      alert('PDF deleted successfully!');
      loadPdfs();
    } catch (error: any) {
      console.error('Error deleting PDF:', error);
      alert(error.message || 'Failed to delete PDF');
    }
  };

  if (user?.role !== 'superadmin') {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md">
        <p className="text-red-600">Access denied. Super admin only.</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📄 PDF Document Portal</h1>
        <p className="text-primary-100">Upload and manage PDF documents. Teachers can annotate and assign them to students.</p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">PDF Documents</h2>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            {showUploadForm ? 'Cancel' : '+ Upload PDF'}
          </button>
        </div>

        {showUploadForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <h3 className="font-semibold mb-4">Upload New PDF</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF File *</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                {selectedFile && (
                  <p className="mt-1 text-sm text-gray-600">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter PDF title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter PDF description (optional)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !title}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload PDF'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDFs...</p>
          </div>
        ) : pdfs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No PDFs uploaded yet</p>
            <p className="text-gray-400 text-sm mt-1">Upload a PDF to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pdfs.map((pdf) => (
              <div key={pdf.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{pdf.title}</h3>
                    {pdf.description && (
                      <p className="text-sm text-gray-600 mt-1">{pdf.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>📄 {pdf.originalFilename}</span>
                      <span>💾 {formatFileSize(pdf.fileSize)}</span>
                      <span>👤 Uploaded by {pdf.uploadedByName}</span>
                      <span>📅 {new Date(pdf.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <a
                      href={pdf.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      View PDF
                    </a>
                    <button
                      onClick={() => {
                        window.open(pdf.fileUrl, '_blank');
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(pdf.id, pdf.title)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfManagement;

