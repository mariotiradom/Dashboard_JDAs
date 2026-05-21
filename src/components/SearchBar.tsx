import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

const SearchBar: React.FC<Props> = ({ items, value, onChange, placeholder = 'Buscar...', icon }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? items.filter(item => item.toLowerCase().includes(query.toLowerCase()))
    : items;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: string) => {
    onChange(item);
    setQuery('');
    setIsOpen(false);
    setHighlightIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && highlightIdx < filtered.length) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <div className="search-bar-input-container">
        <span className="search-bar-icon">
          {icon || <Search size={18} />}
        </span>
        <input
          type="text"
          className="search-bar-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <span className="search-bar-selected-badge">
            {value}
            <X size={14} className="search-bar-clear" onClick={() => { onChange(items[0]); setQuery(''); }} />
          </span>
        )}
      </div>
      {isOpen && filtered.length > 0 && (
        <div className="search-bar-dropdown">
          {filtered.slice(0, 10).map((item, idx) => (
            <div
              key={item}
              className={`search-bar-option ${idx === highlightIdx ? 'highlighted' : ''} ${item === value ? 'selected' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {item}
            </div>
          ))}
          {filtered.length > 10 && (
            <div className="search-bar-more">+{filtered.length - 10} más...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
