/**
 * DataCache Utility Tests
 * 
 * Tests for the cache utility to ensure:
 * - Data is stored correctly
 * - TTL expiration works
 * - Delete removes keys properly
 * - Stale data is never returned
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataCache } from '../utils/dataCache';

describe('dataCache Utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('set() and get()', () => {
    it('should store and retrieve data correctly', () => {
      const testData = [{ id: '1', name: 'Test' }];
      
      dataCache.set('test', testData);
      const retrieved = dataCache.get('test');
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const retrieved = dataCache.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should store different data types', () => {
      dataCache.set('string', 'test');
      dataCache.set('number', 42);
      dataCache.set('object', { key: 'value' });
      dataCache.set('array', [1, 2, 3]);
      
      expect(dataCache.get('string')).toBe('test');
      expect(dataCache.get('number')).toBe(42);
      expect(dataCache.get('object')).toEqual({ key: 'value' });
      expect(dataCache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL Expiration', () => {
    it('should return null for expired cache', () => {
      // Set cache with very short TTL (1ms)
      dataCache.set('expired', { data: 'test' }, 1);
      
      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const retrieved = dataCache.get('expired');
          expect(retrieved).toBeNull();
          resolve();
        }, 10);
      });
    });

    it('should return data before expiration', () => {
      dataCache.set('valid', { data: 'test' }, 1000);
      
      const retrieved = dataCache.get('valid');
      expect(retrieved).toEqual({ data: 'test' });
    });

    it('should remove expired cache automatically on get', () => {
      const key = 'auto-expire';
      dataCache.set(key, { data: 'test' }, 1);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          dataCache.get(key); // Should trigger removal
          
          // Verify it's removed from localStorage
          const stored = localStorage.getItem(`umar_academy_cache_${key}`);
          expect(stored).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('delete()', () => {
    it('should remove cache entry', () => {
      dataCache.set('to-delete', { data: 'test' });
      expect(dataCache.get('to-delete')).not.toBeNull();
      
      dataCache.delete('to-delete');
      expect(dataCache.get('to-delete')).toBeNull();
    });

    it('should not throw error when deleting non-existent key', () => {
      expect(() => {
        dataCache.delete('nonexistent');
      }).not.toThrow();
    });

    it('should completely remove key from localStorage', () => {
      const key = 'complete-removal';
      dataCache.set(key, { data: 'test' });
      
      const beforeDelete = localStorage.getItem(`umar_academy_cache_${key}`);
      expect(beforeDelete).not.toBeNull();
      
      dataCache.delete(key);
      
      const afterDelete = localStorage.getItem(`umar_academy_cache_${key}`);
      expect(afterDelete).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should remove all cache entries', () => {
      dataCache.set('key1', { data: '1' });
      dataCache.set('key2', { data: '2' });
      dataCache.set('key3', { data: '3' });
      
      expect(dataCache.get('key1')).not.toBeNull();
      expect(dataCache.get('key2')).not.toBeNull();
      expect(dataCache.get('key3')).not.toBeNull();
      
      dataCache.clear();
      
      expect(dataCache.get('key1')).toBeNull();
      expect(dataCache.get('key2')).toBeNull();
      expect(dataCache.get('key3')).toBeNull();
    });

    it('should only remove cache entries, not other localStorage items', () => {
      localStorage.setItem('other-key', 'other-value');
      dataCache.set('cache-key', { data: 'test' });
      
      dataCache.clear();
      
      expect(localStorage.getItem('other-key')).toBe('other-value');
      expect(dataCache.get('cache-key')).toBeNull();
    });
  });

  describe('clearExpired()', () => {
    it('should remove expired entries', () => {
      dataCache.set('expired1', { data: '1' }, 1);
      dataCache.set('expired2', { data: '2' }, 1);
      dataCache.set('valid', { data: '3' }, 10000);
      
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          dataCache.clearExpired();
          
          expect(dataCache.get('expired1')).toBeNull();
          expect(dataCache.get('expired2')).toBeNull();
          expect(dataCache.get('valid')).not.toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('Stale Data Prevention', () => {
    it('should never return stale data after delete', () => {
      dataCache.set('stale', { version: 1 });
      expect(dataCache.get('stale')).toEqual({ version: 1 });
      
      dataCache.delete('stale');
      dataCache.set('stale', { version: 2 });
      
      expect(dataCache.get('stale')).toEqual({ version: 2 });
      expect(dataCache.get('stale')).not.toEqual({ version: 1 });
    });

    it('should handle concurrent mutations correctly', () => {
      dataCache.set('concurrent', { value: 'initial' });
      
      // Simulate concurrent updates
      dataCache.delete('concurrent');
      dataCache.set('concurrent', { value: 'updated' });
      
      const retrieved = dataCache.get('concurrent');
      expect(retrieved).toEqual({ value: 'updated' });
      expect(retrieved).not.toEqual({ value: 'initial' });
    });
  });
});
