import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
  rows?: number;
  multiline?: boolean;
  onSelectSuggestion?: (suggestion: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  suggestions,
  placeholder,
  className = '',
  rows = 3,
  multiline = false,
  onSelectSuggestion
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && suggestions.length > 0) {
      // Filter suggestions based on what user is typing
      const searchTerm = value.toLowerCase();
      const filtered = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(searchTerm) &&
        suggestion.toLowerCase() !== searchTerm
      );
      setFilteredSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowSuggestions(filtered.length > 0);
    } else {
      setFilteredSuggestions(suggestions.slice(0, 5)); // Show first 5 when empty
      setShowSuggestions(suggestions.length > 0 && value === '');
    }
  }, [value, suggestions]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    if (onSelectSuggestion) {
      onSelectSuggestion(suggestion);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredSuggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [filteredSuggestions]);

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
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          // Delay hiding to allow clicking on suggestions
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder={placeholder}
        className={className}
        rows={multiline ? rows : undefined}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border-2 border-primary rounded-lg shadow-xl max-h-60 overflow-y-auto"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur event
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelect(suggestion)}
              className={`px-4 py-2 cursor-pointer transition-colors ${
                index === selectedIndex
                  ? 'bg-primary text-white'
                  : 'hover:bg-gray-100 text-gray-800'
              }`}
            >
              <div className="text-sm font-medium">{suggestion}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;

