import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface MistakeLibraryEntry {
  id: string;
  category: 'letter' | 'word' | 'tajweed_rule' | 'memory_technique' | 'general';
  title: string;
  description?: string;
  mistake: string;
  howToFix: string;
  examples?: Array<{ text: string; correct: string; incorrect: string }>;
  tips?: string[];
  relatedMistakes?: string[];
  tags?: string[];
  createdBy?: string;
  createdByName?: string;
  isPublic?: boolean;
  usageCount?: number;
  lastUsed?: Date;
}

interface MistakeLibraryManagementProps {
  onClose: () => void;
  onSelect?: (entry: MistakeLibraryEntry) => void; // For selecting to use in evaluation
  selectMode?: boolean; // If true, show selection interface
}

const MistakeLibraryManagement: React.FC<MistakeLibraryManagementProps> = ({
  onClose,
  onSelect,
  selectMode = false
}) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<MistakeLibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MistakeLibraryEntry | null>(null);

  const [formData, setFormData] = useState({
    category: 'general' as MistakeLibraryEntry['category'],
    title: '',
    description: '',
    mistake: '',
    howToFix: '',
    examples: [] as Array<{ text: string; correct: string; incorrect: string }>,
    tips: [] as string[],
    tags: [] as string[],
    isPublic: true
  });

  const [newExample, setNewExample] = useState({ text: '', correct: '', incorrect: '' });
  const [newTip, setNewTip] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadEntries();
  }, [selectedCategory, searchTerm]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/mistake-library?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mistake library');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const url = editingEntry
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/mistake-library/${editingEntry.id}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/mistake-library`;

      const method = editingEntry ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          createdBy: user?.id || '',
          createdByName: user?.name || user?.email || 'User'
        })
      });

      if (response.ok) {
        setShowAddForm(false);
        setEditingEntry(null);
        resetForm();
        loadEntries();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save entry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/mistake-library/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        loadEntries();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete entry');
    }
  };

  const handleEdit = (entry: MistakeLibraryEntry) => {
    setEditingEntry(entry);
    setFormData({
      category: entry.category,
      title: entry.title,
      description: entry.description || '',
      mistake: entry.mistake,
      howToFix: entry.howToFix,
      examples: entry.examples || [],
      tips: entry.tips || [],
      tags: entry.tags || [],
      isPublic: entry.isPublic !== undefined ? entry.isPublic : true
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      category: 'general',
      title: '',
      description: '',
      mistake: '',
      howToFix: '',
      examples: [],
      tips: [],
      tags: [],
      isPublic: true
    });
    setNewExample({ text: '', correct: '', incorrect: '' });
    setNewTip('');
    setNewTag('');
  };

  const addExample = () => {
    if (newExample.text && newExample.correct) {
      setFormData({
        ...formData,
        examples: [...formData.examples, { ...newExample }]
      });
      setNewExample({ text: '', correct: '', incorrect: '' });
    }
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples.filter((_, i) => i !== index)
    });
  };

  const addTip = () => {
    if (newTip.trim()) {
      setFormData({
        ...formData,
        tips: [...formData.tips, newTip.trim()]
      });
      setNewTip('');
    }
  };

  const removeTip = (index: number) => {
    setFormData({
      ...formData,
      tips: formData.tips.filter((_, i) => i !== index)
    });
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index)
    });
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/mistake-library/export/${format}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mistake-library.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const handleSelect = (entry: MistakeLibraryEntry) => {
    if (onSelect) {
      onSelect(entry);
      // Increment usage count
      fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/mistake-library/${entry.id}/use`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      ).catch(console.error);
    }
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'letter', label: 'Letters' },
    { value: 'word', label: 'Words' },
    { value: 'tajweed_rule', label: 'Tajweed Rules' },
    { value: 'memory_technique', label: 'Memory Techniques' },
    { value: 'general', label: 'General' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary to-[rgba(var(--color-primary-rgb),0.85)] px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                {selectMode ? 'Select from Mistake Library' : 'Mistake Library'}
              </h2>
              <p className="text-white/80 text-sm mt-1">
                {selectMode ? 'Choose a mistake and fix to add to evaluation' : 'Manage common mistakes and fixes'}
              </p>
            </div>
            <div className="flex gap-2">
              {!selectMode && (
                <>
                  <button
                    onClick={() => handleExport('json')}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-sm transition"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-sm transition"
                  >
                    Export CSV
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors text-xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search mistakes, fixes, or tags..."
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
            {!selectMode && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingEntry(null);
                  setShowAddForm(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition"
              >
                + Add Entry
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showAddForm ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-primary">
                {editingEntry ? 'Edit Entry' : 'Add New Entry'}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="letter">Letter</option>
                    <option value="word">Word</option>
                    <option value="tajweed_rule">Tajweed Rule</option>
                    <option value="memory_technique">Memory Technique</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Heavy Letter (ق)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="Detailed description..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Common Mistake</label>
                <textarea
                  value={formData.mistake}
                  onChange={(e) => setFormData({ ...formData, mistake: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="Describe the common mistake..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">How to Fix</label>
                <textarea
                  value={formData.howToFix}
                  onChange={(e) => setFormData({ ...formData, howToFix: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Explain how to fix this mistake..."
                  required
                />
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Examples</label>
                {formData.examples.map((example, index) => (
                  <div key={index} className="mb-2 p-3 bg-gray-50 rounded-lg flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm"><strong>Text:</strong> {example.text}</p>
                      <p className="text-sm text-green-600"><strong>Correct:</strong> {example.correct}</p>
                      {example.incorrect && (
                        <p className="text-sm text-red-600"><strong>Incorrect:</strong> {example.incorrect}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeExample(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input
                    type="text"
                    value={newExample.text}
                    onChange={(e) => setNewExample({ ...newExample, text: e.target.value })}
                    placeholder="Example text"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newExample.correct}
                    onChange={(e) => setNewExample({ ...newExample, correct: e.target.value })}
                    placeholder="Correct"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={newExample.incorrect}
                    onChange={(e) => setNewExample({ ...newExample, incorrect: e.target.value })}
                    placeholder="Incorrect (optional)"
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={addExample}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-bold"
                >
                  + Add Example
                </button>
              </div>

              {/* Tips */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Teaching Tips</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tips.map((tip, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                      {tip}
                      <button onClick={() => removeTip(index)} className="text-blue-600 hover:text-blue-800">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTip}
                    onChange={(e) => setNewTip(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTip()}
                    placeholder="Add a teaching tip..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={addTip}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm flex items-center gap-2">
                      {tag}
                      <button onClick={() => removeTag(index)} className="text-gray-600 hover:text-gray-800">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">Make this entry public (shareable)</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingEntry(null);
                    resetForm();
                  }}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90"
                >
                  {editingEntry ? 'Update' : 'Save'} Entry
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading mistake library...</p>
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">No entries found. Add your first entry to get started!</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-primary transition">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-primary text-white rounded-full text-xs font-bold">
                            {entry.category}
                          </span>
                          <h3 className="text-lg font-bold text-primary">{entry.title}</h3>
                        </div>
                        {entry.description && (
                          <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                        )}
                      </div>
                      {!selectMode && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">Common Mistake:</p>
                        <p className="text-sm text-red-600">{entry.mistake}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-1">How to Fix:</p>
                        <p className="text-sm text-green-600">{entry.howToFix}</p>
                      </div>
                    </div>

                    {entry.examples && entry.examples.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-700 mb-1">Examples:</p>
                        {entry.examples.map((example, idx) => (
                          <div key={idx} className="text-sm bg-gray-50 p-2 rounded mb-1">
                            <span className="font-semibold">{example.text}</span> → 
                            <span className="text-green-600 ml-1">{example.correct}</span>
                            {example.incorrect && (
                              <span className="text-red-600 ml-2">(not: {example.incorrect})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {entry.tips && entry.tips.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-700 mb-1">Teaching Tips:</p>
                        <ul className="list-disc list-inside text-sm text-gray-600">
                          {entry.tips.map((tip, idx) => (
                            <li key={idx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {entry.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectMode && (
                      <button
                        onClick={() => handleSelect(entry)}
                        className="w-full mt-3 px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90"
                      >
                        Use This Fix
                      </button>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      {entry.usageCount ? `Used ${entry.usageCount} times` : 'Never used'} • 
                      Created by {entry.createdByName || 'Unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MistakeLibraryManagement;

