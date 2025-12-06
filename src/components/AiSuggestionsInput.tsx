import React, { useState, useEffect, useRef } from 'react';

interface AiSuggestionsInputProps {
  value: string;
  onChange: (value: string) => void;
  category: string; // e.g., "progress_report", "evaluation", "attendance", "general"
  placeholder?: string;
  className?: string;
  rows?: number;
  multiline?: boolean;
  disabled?: boolean;
}

interface Suggestion {
  id: string;
  phrase: string;
  category: string;
  usageCount?: number;
}

const AiSuggestionsInput: React.FC<AiSuggestionsInputProps> = ({
  value,
  onChange,
  category,
  placeholder = '',
  className = '',
  rows = 3,
  multiline = false,
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch suggestions based on category (show all, not filtered by input)
  const fetchSuggestions = async () => {
    if (!category) return;

    try {
      setLoading(true);
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
      
      // Only send category, not the query - show all phrases from library
      const params = new URLSearchParams();
      params.append('category', category);
      // Don't append query - we want all suggestions from the library

      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/ai/suggestions?${params.toString()}`, {
        headers
      });

        if (response.ok) {
          const data = await response.json();
          console.log('AI Suggestions response:', { category, query: searchQuery, dataLength: Array.isArray(data) ? data.length : 0, data });
          // Transform data to match expected format
          const formattedSuggestions = Array.isArray(data) ? data.map((item: any) => ({
            id: item.id || item._id || `suggestion-${Date.now()}-${Math.random()}`,
            phrase: item.phrase || item.text || item,
            category: item.category || category,
            usageCount: item.usageCount || 0
          })) : [];
          
          console.log('Formatted suggestions:', formattedSuggestions.length, formattedSuggestions);
          
          // If no suggestions and category is 'general', try to initialize
          if (formattedSuggestions.length === 0 && category === 'general') {
            console.warn('⚠️ No phrases found, attempting to initialize...');
            try {
              // Try to call initialization endpoint
              const initResponse = await fetch(`${apiUrl}/ai/phrases/init-categories`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
              });
              
              if (initResponse.ok) {
                console.log('✅ Initialization successful, retrying suggestions...');
                // Retry fetching suggestions after a short delay
                setTimeout(async () => {
                  try {
                    const retryResponse = await fetch(`${apiUrl}/ai/suggestions?${params.toString()}`, {
                      headers
                    });
                    if (retryResponse.ok) {
                      const retryData = await retryResponse.json();
                      const retrySuggestions = Array.isArray(retryData) ? retryData.map((item: any) => ({
                        id: item.id || item._id || `suggestion-${Date.now()}-${Math.random()}`,
                        phrase: item.phrase || item.text || item,
                        category: item.category || category,
                        usageCount: item.usageCount || 0
                      })) : [];
                      setSuggestions(retrySuggestions);
                      setShowSuggestions(retrySuggestions.length > 0);
                    }
                  } catch (retryErr) {
                    console.error('Error retrying suggestions:', retryErr);
                  }
                }, 500);
              }
            } catch (initErr) {
              console.error('Error initializing:', initErr);
            }
          }
          
          setSuggestions(formattedSuggestions);
          setShowSuggestions(formattedSuggestions.length > 0);
        } else {
          const errorText = await response.text();
          console.error('❌ Failed to fetch suggestions:', response.status, response.statusText, errorText);
          setSuggestions([]);
          setShowSuggestions(false);
        }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  // Fetch suggestions on focus or when category changes (not based on input value)
  useEffect(() => {
    // Fetch suggestions when category changes
    fetchSuggestions();
  }, [category]);

  // Also fetch on focus to ensure suggestions are shown
  const handleFocus = () => {
    fetchSuggestions();
  };

  const handleSelect = async (suggestion: Suggestion) => {
    onChange(suggestion.phrase);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    // Track usage
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const apiUrl = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
      const token = localStorage.getItem('token') || localStorage.getItem('umar_academy_token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(`${apiUrl}/ai/phrases/${suggestion.id}/use`, {
        method: 'POST',
        headers
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [suggestions]);

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="relative">
      <InputComponent
        ref={inputRef as any}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={() => {
          // Delay hiding to allow clicking on suggestions
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder={placeholder}
        className={className}
        rows={multiline ? rows : undefined}
        disabled={disabled}
      />
      
      {(showSuggestions || loading) && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border-2 border-primary rounded-lg shadow-xl max-h-60 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur event
        >
          {loading && (
            <div className="px-4 py-2 text-sm text-gray-500 text-center">
              Loading suggestions...
            </div>
          )}
          {!loading && suggestions.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500 text-center">
              No suggestions available. Add phrases in AI Library.
            </div>
          )}
          {!loading && suggestions.length > 0 && suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              onClick={() => handleSelect(suggestion)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm font-medium">{suggestion.phrase}</div>
              {suggestion.usageCount && suggestion.usageCount > 0 && (
                <div className="text-xs opacity-70 mt-1">
                  Used {suggestion.usageCount} times
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiSuggestionsInput;

