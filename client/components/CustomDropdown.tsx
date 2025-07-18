import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-dropdown" ref={dropdownRef}>
      <div 
        className={`dropdown-header ${isOpen ? 'open' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? '' : 'text-gray-500'}>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      
      {isOpen && (
        <div className="dropdown-list">
          <div className="dropdown-title">{placeholder}</div>
          {options.map((option) => (
            <div
              key={option.value}
              className={`dropdown-item ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .custom-dropdown {
          position: relative;
          width: 100%;
          font-family: 'Inter', sans-serif;
        }

        .dropdown-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: transparent;
          border: 0.4px solid #D8D8D8;
          border-radius: 4px;
          color: #D8D8D8;
          cursor: pointer;
          height: 36px;
          font-size: 14px;
        }

        .dropdown-header.open {
          border-color: #808080;
        }

        .dropdown-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #000000;
          border: 0.5px solid #434343;
          border-radius: 4px;
          margin-top: 4px;
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          padding: 8px;
        }

        .dropdown-title {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-weight: 500;
          padding: 8px 4px;
          cursor: default;
        }

        .dropdown-item {
          padding: 8px 12px;
          cursor: pointer;
          color: #D8D8D8;
          font-size: 14px;
          height: 33px;
          display: flex;
          align-items: center;
          margin: 0 4px;
        }

        .dropdown-item:hover {
          background: rgba(128, 128, 128, 0.2);
        }

        .dropdown-item.selected {
          background: rgba(128, 128, 128, 0.3);
          cursor: default;
        }

        /* Scrollbar styling */
        .dropdown-list::-webkit-scrollbar {
          width: 8px;
        }

        .dropdown-list::-webkit-scrollbar-track {
          background: #000000;
        }

        .dropdown-list::-webkit-scrollbar-thumb {
          background: #434343;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default CustomDropdown; 