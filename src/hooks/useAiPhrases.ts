import { useState, useEffect, useCallback } from 'react';

export interface AiPhrase {
  _id: string;
  phrase: string;
  category: string;
  createdBy: string;
  createdByName: string;
  usageCount: number;
  lastUsed?: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AiPhraseCategory {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  isSystem: boolean;
  phraseCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const API_BASE = (import.meta.env?.VITE_API_BASE_URL as string) || 'http://localhost:3001/api';
const getApiUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return base.endsWith('/api') ? base : `${base}/api`;
};

export const useAiPhrases = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCategories = useCallback(async (): Promise<AiPhraseCategory[]> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/ai/phrases/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch categories';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPhrases = useCallback(async (category?: string, search?: string): Promise<AiPhrase[]> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);

      const response = await fetch(`${apiUrl}/ai/phrases?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch phrases');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch phrases';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (name: string, displayName: string, description?: string): Promise<AiPhraseCategory> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`${apiUrl}/ai/phrases/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name,
          displayName,
          description,
          createdBy: user.id || '',
          createdByName: user.name || user.email || 'System'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create category');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCategory = useCallback(async (name: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/ai/phrases/categories/${name}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete category';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPhrase = useCallback(async (phrase: string, category: string): Promise<AiPhrase> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      const response = await fetch(`${apiUrl}/ai/phrases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          phrase,
          category,
          createdBy: user.id || '',
          createdByName: user.name || user.email || 'System'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create phrase');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create phrase';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePhrase = useCallback(async (id: string, phrase?: string, category?: string): Promise<AiPhrase> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      
      const response = await fetch(`${apiUrl}/ai/phrases/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          phrase,
          category
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update phrase');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update phrase';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePhrase = useCallback(async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/ai/phrases/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete phrase');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete phrase';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const initializeCategories = useCallback(async (): Promise<any> => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/ai/phrases/init-categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initialize categories');
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize categories';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    getCategories,
    getPhrases,
    createCategory,
    deleteCategory,
    createPhrase,
    updatePhrase,
    deletePhrase,
    initializeCategories
  };
};

