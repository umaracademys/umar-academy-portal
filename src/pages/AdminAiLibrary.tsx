import React, { useState, useEffect } from 'react';
import { useAiPhrases, AiPhrase, AiPhraseCategory } from '../hooks/useAiPhrases';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/Card';

const AdminAiLibrary: React.FC = () => {
  const { user } = useAuth();
  const {
    loading,
    error,
    getCategories,
    getPhrases,
    createPhrase,
    updatePhrase,
    deletePhrase
  } = useAiPhrases();

  const [categories, setCategories] = useState<AiPhraseCategory[]>([]);
  const [phrases, setPhrases] = useState<AiPhrase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPhraseForm, setShowPhraseForm] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<AiPhrase | null>(null);

  const [phraseForm, setPhraseForm] = useState({
    phrase: '',
    category: ''
  });
  const [bulkPhrases, setBulkPhrases] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadPhrases(selectedCategory);
    } else {
      loadPhrases();
    }
  }, [selectedCategory, searchTerm]);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].name);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const loadPhrases = async (category?: string) => {
    try {
      const data = await getPhrases(category, searchTerm);
      setPhrases(data);
    } catch (err) {
      console.error('Error loading phrases:', err);
    }
  };

  const handleCreatePhrase = async () => {
    try {
      if (editingPhrase) {
        await updatePhrase(editingPhrase._id, phraseForm.phrase, phraseForm.category);
      } else {
        if (!phraseForm.phrase.trim()) {
          alert('Please enter a phrase');
          return;
        }
        if (!phraseForm.category && !selectedCategory) {
          alert('Please select a category');
          return;
        }
        await createPhrase(phraseForm.phrase.trim(), phraseForm.category || selectedCategory);
      }
      setPhraseForm({ phrase: '', category: '' });
      setEditingPhrase(null);
      setShowPhraseForm(false);
      await loadPhrases(selectedCategory);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save phrase');
    }
  };

  const handleBulkAddPhrases = async () => {
    if (!bulkPhrases.trim()) {
      alert('Please enter phrases');
      return;
    }
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    try {
      // Split by newlines and filter out empty lines
      const phrases = bulkPhrases
        .split('\n')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      if (phrases.length === 0) {
        alert('No valid phrases found');
        return;
      }

      // Create phrases one by one
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const phrase of phrases) {
        try {
          await createPhrase(phrase, selectedCategory);
          successCount++;
        } catch (err) {
          errorCount++;
          errors.push(`${phrase}: ${err instanceof Error ? err.message : 'Failed'}`);
        }
      }

      setBulkPhrases('');
      setShowBulkAdd(false);

      if (errorCount > 0) {
        alert(`Added ${successCount} phrases. ${errorCount} failed:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Successfully added ${successCount} phrases!`);
      }

      await loadPhrases(selectedCategory);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add phrases');
    }
  };

  const handleDeletePhrase = async (id: string) => {
    if (!confirm('Are you sure you want to delete this phrase?')) {
      return;
    }

    try {
      await deletePhrase(id);
      await loadPhrases(selectedCategory);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete phrase');
    }
  };

  const handleEditPhrase = (phrase: AiPhrase) => {
    setEditingPhrase(phrase);
    setPhraseForm({
      phrase: phrase.phrase,
      category: phrase.category
    });
    setShowPhraseForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">AI Phrase Library</h1>
          <p className="text-gray-600">Add phrases to existing categories (categories can only be created by Super Admin)</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg border-2 border-red-500 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-800">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <div className="p-4">
                <h2 className="text-xl font-bold text-primary mb-4">Categories</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {categories.map((category) => (
                    <div
                      key={category._id}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                        selectedCategory === category.name
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <div>
                        <h3 className="font-bold text-primary">{category.displayName}</h3>
                        <p className="text-xs text-gray-600">{category.phraseCount || 0} phrases</p>
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Phrases Main Area */}
          <div className="lg:col-span-2">
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-primary">
                    {selectedCategory
                      ? categories.find(c => c.name === selectedCategory)?.displayName || 'Phrases'
                      : 'All Phrases'}
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowBulkAdd(true);
                        setShowPhraseForm(false);
                      }}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600"
                    >
                      📝 Bulk Add
                    </button>
                    <button
                      onClick={() => {
                        setEditingPhrase(null);
                        setPhraseForm({ phrase: '', category: selectedCategory });
                        setShowPhraseForm(true);
                        setShowBulkAdd(false);
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90"
                    >
                      + Add Phrase
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search phrases..."
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Bulk Add Form */}
                {showBulkAdd && (
                  <div className="mb-4 p-4 bg-purple-50 rounded-lg border-2 border-purple-500">
                    <h3 className="text-sm font-bold text-purple-700 mb-2">
                      Bulk Add Phrases (one per line)
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      Enter multiple phrases, one per line. They will be added to: <strong>{categories.find(c => c.name === selectedCategory)?.displayName || selectedCategory}</strong>
                    </p>
                    <textarea
                      value={bulkPhrases}
                      onChange={(e) => setBulkPhrases(e.target.value)}
                      placeholder="Enter phrases, one per line:&#10;Excellent pronunciation&#10;Good application of rules&#10;Needs more practice"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 resize-none font-mono"
                      rows={8}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleBulkAddPhrases}
                        disabled={!bulkPhrases.trim() || !selectedCategory}
                        className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 disabled:opacity-50"
                      >
                        Add All Phrases
                      </button>
                      <button
                        onClick={() => {
                          setShowBulkAdd(false);
                          setBulkPhrases('');
                        }}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Phrase Form */}
                {showPhraseForm && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg border-2 border-primary">
                    <h3 className="text-sm font-bold text-primary mb-2">
                      {editingPhrase ? 'Edit Phrase' : 'New Phrase'}
                    </h3>
                    <textarea
                      value={phraseForm.phrase}
                      onChange={(e) => setPhraseForm({ ...phraseForm, phrase: e.target.value })}
                      placeholder="Enter phrase..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 resize-none"
                      rows={3}
                    />
                    <select
                      value={phraseForm.category || selectedCategory}
                      onChange={(e) => setPhraseForm({ ...phraseForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat.name}>{cat.displayName}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreatePhrase}
                        disabled={!phraseForm.phrase.trim() || (!phraseForm.category && !selectedCategory)}
                        className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50"
                      >
                        {editingPhrase ? 'Update' : 'Create'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPhraseForm(false);
                          setEditingPhrase(null);
                          setPhraseForm({ phrase: '', category: '' });
                        }}
                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Phrases List */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading phrases...</p>
                  </div>
                ) : phrases.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No phrases found. Add your first phrase!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    <div className="mb-2 text-xs text-gray-500 font-semibold">
                      Showing {phrases.length} phrase{phrases.length !== 1 ? 's' : ''}
                    </div>
                    {phrases.map((phrase) => (
                      <div
                        key={phrase._id}
                        className="p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-primary/50 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 mb-1">{phrase.phrase}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {categories.find(c => c.name === phrase.category)?.displayName || phrase.category}
                              </span>
                              {phrase.usageCount > 0 && (
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                  Used {phrase.usageCount} time{phrase.usageCount !== 1 ? 's' : ''}
                                </span>
                              )}
                              {phrase.createdByName && (
                                <span className="text-xs text-gray-400">
                                  by {phrase.createdByName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-2">
                            <button
                              onClick={() => handleEditPhrase(phrase)}
                              className="px-2 py-1 bg-blue-500 text-white rounded text-xs font-bold hover:bg-blue-600 transition"
                              title="Edit phrase"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePhrase(phrase._id)}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold hover:bg-red-600 transition"
                              title="Delete phrase"
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAiLibrary;

