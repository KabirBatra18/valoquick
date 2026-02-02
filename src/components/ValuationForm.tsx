'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import {
  ValuationReport,
  Owner,
  DEFAULT_COMPANY_DETAILS,
  calculateValues,
} from '@/types/valuation';
import { ReportFormData } from '@/types/report';

interface ValuationFormProps {
  onGenerate: (data: ValuationReport) => void;
  isGenerating: boolean;
  activeSection: number;
  setActiveSection: (section: number) => void;
  initialData?: ReportFormData;
  onDataChange?: (data: ReportFormData) => void;
}

// Reusable Input Component
const FormInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input className="form-input" {...props} />
  </div>
);

// Modern Date Picker Component
const FormDatePicker = ({ label, value, onChange, required }: {
  label: string;
  value: string; // DD-MM-YYYY format
  onChange: (value: string) => void;
  required?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLDivElement>(null);

  // Parse DD-MM-YYYY to Date object
  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  // Format Date to DD-MM-YYYY
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const currentDate = parseDate(value) || new Date();
  const [viewMonth, setViewMonth] = useState(currentDate.getMonth());
  const [viewYear, setViewYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    setMounted(true);
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
    if (currentTheme) setTheme(currentTheme);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
          setTheme(newTheme || 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const calendarHeight = 340;

        setPosition({
          top: spaceBelow > calendarHeight ? rect.bottom + 4 : rect.top - calendarHeight - 4,
          left: Math.min(rect.left, window.innerWidth - 300),
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        const dropdown = document.getElementById(`datepicker-${label.replace(/\s+/g, '-')}`);
        if (dropdown && dropdown.contains(target)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [label]);

  // Update view when value changes externally
  useEffect(() => {
    const parsed = parseDate(value);
    if (parsed) {
      setViewMonth(parsed.getMonth());
      setViewYear(parsed.getFullYear());
    }
  }, [value]);

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handleSelectDate = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    onChange(formatDate(newDate));
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
    onChange(formatDate(today));
    setIsOpen(false);
  };

  const selectedDate = parseDate(value);
  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === viewMonth &&
           selectedDate.getFullYear() === viewYear;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === viewMonth &&
           today.getFullYear() === viewYear;
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const calendarContent = isOpen && mounted && (
    <div
      id={`datepicker-${label.replace(/\s+/g, '-')}`}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 99999,
      }}
      className={`w-[280px] rounded-2xl shadow-2xl overflow-hidden ${
        theme === 'light'
          ? 'bg-white border border-neutral-200'
          : 'bg-[rgb(24,24,27)] border border-[rgba(255,255,255,0.15)]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-3 ${
        theme === 'light' ? 'bg-neutral-50' : 'bg-[rgba(255,255,255,0.05)]'
      }`}>
        <button
          type="button"
          onClick={handlePrevMonth}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'light'
              ? 'hover:bg-neutral-200 text-neutral-600'
              : 'hover:bg-[rgba(255,255,255,0.1)] text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(parseInt(e.target.value))}
            className={`text-sm font-medium bg-transparent border-none outline-none cursor-pointer ${
              theme === 'light' ? 'text-neutral-800' : 'text-white'
            }`}
          >
            {MONTHS.map((month, i) => (
              <option key={month} value={i} className={theme === 'light' ? 'bg-white' : 'bg-[rgb(24,24,27)]'}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={viewYear}
            onChange={(e) => setViewYear(parseInt(e.target.value))}
            className={`text-sm font-medium bg-transparent border-none outline-none cursor-pointer ${
              theme === 'light' ? 'text-neutral-800' : 'text-white'
            }`}
          >
            {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i).map((year) => (
              <option key={year} value={year} className={theme === 'light' ? 'bg-white' : 'bg-[rgb(24,24,27)]'}>
                {year}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            theme === 'light'
              ? 'hover:bg-neutral-200 text-neutral-600'
              : 'hover:bg-[rgba(255,255,255,0.1)] text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 py-2">
        {DAYS.map((day) => (
          <div key={day} className={`text-center text-xs font-medium py-1 ${
            theme === 'light' ? 'text-neutral-400' : 'text-[rgba(255,255,255,0.4)]'
          }`}>
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 px-2 pb-2 gap-1">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="w-8 h-8" />
        ))}
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => handleSelectDate(day)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
              isSelectedDay(day)
                ? 'bg-brand text-white shadow-lg shadow-brand/30'
                : isToday(day)
                  ? theme === 'light'
                    ? 'bg-indigo-50 text-brand font-semibold'
                    : 'bg-brand/20 text-brand-light font-semibold'
                  : theme === 'light'
                    ? 'text-neutral-700 hover:bg-neutral-100'
                    : 'text-white hover:bg-[rgba(255,255,255,0.1)]'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-3 py-2 border-t ${
        theme === 'light' ? 'border-neutral-100' : 'border-[rgba(255,255,255,0.1)]'
      }`}>
        <button
          type="button"
          onClick={handleToday}
          className="text-xs font-medium text-brand hover:text-brand-light transition-colors"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className={`text-xs font-medium transition-colors ${
            theme === 'light' ? 'text-neutral-500 hover:text-neutral-700' : 'text-[rgba(255,255,255,0.5)] hover:text-white'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="form-group" ref={containerRef}>
      <label className="form-label">{label}</label>
      <div ref={inputRef}>
        <div className="flex gap-2">
          <input
            className="form-input flex-1"
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="DD-MM-YYYY"
            required={required}
          />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
              theme === 'light'
                ? 'bg-neutral-100 border border-neutral-300 hover:bg-neutral-200'
                : 'bg-surface-200 border border-surface-300 hover:bg-surface-300'
            }`}
            title="Open calendar"
          >
            <svg
              className={`w-5 h-5 ${
                theme === 'light' ? 'text-neutral-600' : 'text-text-secondary'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </button>
        </div>
      </div>
      {mounted && calendarContent && createPortal(calendarContent, document.body)}
    </div>
  );
};

// Reusable Select Component
const FormSelect = ({ label, options, ...props }: {
  label: string;
  options: { value: string; label: string }[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <select className="form-select" {...props}>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// Reusable Combobox Component - Text input with dropdown suggestions
const FormSelectWithCustom = ({ label, options, value, onChange, placeholder }: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [searchQuery, setSearchQuery] = useState(''); // Track what user is typing for filtering
  const [isSearching, setIsSearching] = useState(false); // Track if user is actively searching
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    // Check initial theme
    const currentTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
    if (currentTheme) setTheme(currentTheme);

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = document.documentElement.getAttribute('data-theme') as 'dark' | 'light' | null;
          setTheme(newTheme || 'dark');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Update position when dropdown opens or window scrolls/resizes
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && inputWrapperRef.current) {
        const rect = inputWrapperRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Reset search state when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsSearching(false);
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        // Also check if click is on the portal dropdown
        const dropdown = document.getElementById(`dropdown-${label.replace(/\s+/g, '-')}`);
        if (dropdown && dropdown.contains(target)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [label]);

  // Only filter when user is actively searching, otherwise show all options
  const filteredOptions = options.filter(opt => {
    if (!opt.value) return false; // Skip empty values
    if (!isSearching || !searchQuery) return true; // Show all when not searching
    return opt.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const dropdownContent = isOpen && filteredOptions.length > 0 && mounted && (
    <div
      id={`dropdown-${label.replace(/\s+/g, '-')}`}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 99999,
      }}
      className={`rounded-xl shadow-2xl max-h-60 overflow-y-auto ${
        theme === 'light'
          ? 'bg-white border border-neutral-200'
          : 'bg-[rgb(24,24,27)] border border-[rgba(255,255,255,0.2)]'
      }`}
    >
      {filteredOptions.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleSelectOption(opt.value)}
          className={`w-full px-4 py-3 text-left text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${
            theme === 'light'
              ? value === opt.value
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-neutral-800 hover:bg-neutral-100'
              : value === opt.value
                ? 'bg-[rgba(99,102,241,0.25)] text-white font-medium'
                : 'text-[rgba(255,255,255,0.95)] hover:bg-[rgba(255,255,255,0.12)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchQuery(newValue);
    setIsSearching(true);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelectOption = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setIsSearching(false);
    setSearchQuery('');
  };

  return (
    <div className="form-group" ref={containerRef}>
      <label className="form-label">{label}</label>
      <div ref={inputWrapperRef}>
        <div className="flex gap-2">
          <input
            className="form-input flex-1"
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={() => {
              setIsOpen(true);
              setIsSearching(false); // Don't filter on focus, show all options
            }}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          />
          <button
            type="button"
            onClick={() => {
              setIsOpen(!isOpen);
              setIsSearching(false); // Show all options when clicking button
            }}
            className={`px-3 rounded-xl transition-all duration-200 flex items-center justify-center ${
              theme === 'light'
                ? 'bg-neutral-100 border border-neutral-300 hover:bg-neutral-200'
                : 'bg-surface-200 border border-surface-300 hover:bg-surface-300'
            }`}
            title="Show options"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${
                theme === 'light' ? 'text-neutral-600' : 'text-text-secondary'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>
      {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
};

// Dropdown Options
const CITY_OPTIONS = [
  { value: 'NEW DELHI', label: 'New Delhi' },
  { value: 'MUMBAI', label: 'Mumbai' },
  { value: 'BANGALORE', label: 'Bangalore' },
  { value: 'CHENNAI', label: 'Chennai' },
  { value: 'KOLKATA', label: 'Kolkata' },
  { value: 'HYDERABAD', label: 'Hyderabad' },
  { value: 'PUNE', label: 'Pune' },
  { value: 'AHMEDABAD', label: 'Ahmedabad' },
  { value: 'JAIPUR', label: 'Jaipur' },
  { value: 'LUCKNOW', label: 'Lucknow' },
  { value: 'CHANDIGARH', label: 'Chandigarh' },
  { value: 'NOIDA', label: 'Noida' },
  { value: 'GURGAON', label: 'Gurgaon' },
  { value: 'GHAZIABAD', label: 'Ghaziabad' },
  { value: 'FARIDABAD', label: 'Faridabad' },
];

const BOUNDARY_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Road', label: 'Road' },
  { value: '20\' Road', label: '20\' Road' },
  { value: '30\' Road', label: '30\' Road' },
  { value: '36\' Road', label: '36\' Road' },
  { value: '40\' Road', label: '40\' Road' },
  { value: '60\' Road', label: '60\' Road' },
  { value: 'Park', label: 'Park' },
  { value: 'Lane', label: 'Lane' },
  { value: 'Common Passage', label: 'Common Passage' },
  { value: 'Adjoining Plot', label: 'Adjoining Plot' },
  { value: 'Neighbour Property', label: 'Neighbour Property' },
  { value: 'Open Land', label: 'Open Land' },
  { value: 'Nallah', label: 'Nallah' },
  { value: 'Boundary Wall', label: 'Boundary Wall' },
];

const PURPOSE_OPTIONS = [
  { value: 'To assess Fair Market Value of the property for property gain purpose', label: 'Capital Gains (Property Gain)' },
  { value: 'To assess Fair Market Value for capital gains tax calculation', label: 'Capital Gains Tax' },
  { value: 'To assess Fair Market Value as on 01-04-2001 for income tax purpose', label: 'Income Tax (FMV as on 01-04-2001)' },
  { value: 'For mortgage/loan against property purpose', label: 'Mortgage/Loan Purpose' },
  { value: 'For insurance coverage assessment', label: 'Insurance Purpose' },
  { value: 'For legal proceedings and dispute resolution', label: 'Legal Proceedings' },
  { value: 'For inheritance and settlement of estate', label: 'Inheritance/Settlement' },
  { value: 'For sale/purchase transaction', label: 'Sale/Purchase' },
  { value: 'For stamp duty and registration purpose', label: 'Stamp Duty/Registration' },
  { value: 'For wealth tax assessment', label: 'Wealth Tax' },
];

const LAND_RATE_SOURCE_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'L&DO rates', label: 'L&DO Rates' },
  { value: 'Circle Rate', label: 'Circle Rate' },
  { value: 'DDA rates', label: 'DDA Rates' },
  { value: 'Municipal rates', label: 'Municipal Rates' },
  { value: 'Market rate as per sale instances', label: 'Market Rate (Sale Instances)' },
  { value: 'State PWD rates', label: 'State PWD Rates' },
  { value: 'Collector rates', label: 'Collector Rates' },
];

const ROOF_OPTIONS = [
  { value: 'R.C.C', label: 'R.C.C (Reinforced Cement Concrete)' },
  { value: 'RCC Slab', label: 'RCC Slab' },
  { value: 'RCC with waterproofing', label: 'RCC with Waterproofing' },
  { value: 'Asbestos Sheets', label: 'Asbestos Sheets' },
  { value: 'GI/Metal Sheets', label: 'GI/Metal Sheets' },
  { value: 'Mangalore Tiles', label: 'Mangalore Tiles' },
  { value: 'Stone Slabs', label: 'Stone Slabs' },
  { value: 'Mud Terrace', label: 'Mud Terrace' },
  { value: 'Pre-fabricated', label: 'Pre-fabricated' },
];

const BRICKWORK_OPTIONS = [
  { value: '9" thick brick masonry', label: '9" Thick Brick Masonry' },
  { value: '4.5" thick brick masonry', label: '4.5" Thick Brick Masonry' },
  { value: '6" thick brick masonry', label: '6" Thick Brick Masonry' },
  { value: 'AAC Blocks', label: 'AAC Blocks' },
  { value: 'Concrete Blocks', label: 'Concrete Blocks' },
  { value: 'Fly Ash Bricks', label: 'Fly Ash Bricks' },
  { value: 'Red Brick', label: 'Red Brick' },
  { value: 'Hollow Blocks', label: 'Hollow Blocks' },
];

const FLOORING_OPTIONS = [
  { value: 'Marble', label: 'Marble' },
  { value: 'Italian Marble', label: 'Italian Marble' },
  { value: 'Vitrified Tiles', label: 'Vitrified Tiles' },
  { value: 'Ceramic Tiles', label: 'Ceramic Tiles' },
  { value: 'Granite', label: 'Granite' },
  { value: 'Kota Stone', label: 'Kota Stone' },
  { value: 'Terrazzo/Mosaic', label: 'Terrazzo/Mosaic' },
  { value: 'Red Oxide', label: 'Red Oxide' },
  { value: 'Cement Flooring', label: 'Cement Flooring' },
  { value: 'Wooden/Laminate', label: 'Wooden/Laminate' },
  { value: 'IPS Flooring', label: 'IPS (Indian Patent Stone)' },
];

const TILES_OPTIONS = [
  { value: 'Glazed tiles in bathroom', label: 'Glazed Tiles in Bathroom' },
  { value: 'Ceramic tiles in bathroom', label: 'Ceramic Tiles in Bathroom' },
  { value: 'Vitrified tiles in bathroom', label: 'Vitrified Tiles in Bathroom' },
  { value: 'Designer tiles in bathroom', label: 'Designer Tiles in Bathroom' },
  { value: 'Plain tiles in bathroom', label: 'Plain Tiles in Bathroom' },
  { value: 'Glazed tiles upto dado level', label: 'Glazed Tiles upto Dado Level' },
  { value: 'Full height tiles in bathroom', label: 'Full Height Tiles in Bathroom' },
];

const ELECTRICAL_OPTIONS = [
  { value: 'Internal conduit', label: 'Internal Conduit' },
  { value: 'Concealed wiring', label: 'Concealed Wiring' },
  { value: 'Surface wiring', label: 'Surface Wiring' },
  { value: 'PVC conduit', label: 'PVC Conduit' },
  { value: 'Concealed copper wiring', label: 'Concealed Copper Wiring' },
];

const ELECTRICAL_SWITCHES_OPTIONS = [
  { value: 'Good quality', label: 'Good Quality' },
  { value: 'Superior quality', label: 'Superior Quality' },
  { value: 'Modular switches', label: 'Modular Switches' },
  { value: 'Standard quality', label: 'Standard Quality' },
  { value: 'Premium branded', label: 'Premium Branded' },
];

const SANITARY_FIXTURES_OPTIONS = [
  { value: 'White', label: 'White' },
  { value: 'Coloured', label: 'Coloured' },
  { value: 'Superior white', label: 'Superior White' },
  { value: 'Superior coloured', label: 'Superior Coloured' },
  { value: 'Branded (Hindware/Jaquar)', label: 'Branded (Hindware/Jaquar)' },
  { value: 'Premium imported', label: 'Premium Imported' },
];

const WOODWORK_OPTIONS = [
  { value: 'Doors & windows are of Teak wood', label: 'Teak Wood Doors & Windows' },
  { value: 'Sal wood doors & windows', label: 'Sal Wood Doors & Windows' },
  { value: 'Pine wood doors & windows', label: 'Pine Wood Doors & Windows' },
  { value: 'Flush doors with teak frame', label: 'Flush Doors with Teak Frame' },
  { value: 'Flush doors with sal frame', label: 'Flush Doors with Sal Frame' },
  { value: 'PVC doors', label: 'PVC Doors' },
  { value: 'Aluminium windows', label: 'Aluminium Windows' },
  { value: 'UPVC windows', label: 'UPVC Windows' },
  { value: 'Teak wood with glass panels', label: 'Teak Wood with Glass Panels' },
];

const FLOOR_HEIGHT_OPTIONS = [
  { value: '9\'0"', label: '9\'0"' },
  { value: '9\'6"', label: '9\'6"' },
  { value: '10\'0"', label: '10\'0"' },
  { value: '10\'6"', label: '10\'6"' },
  { value: '11\'0"', label: '11\'0"' },
  { value: '11\'6"', label: '11\'6"' },
  { value: '12\'0"', label: '12\'0"' },
  { value: '14\'0"', label: '14\'0"' },
];

const FOUNDATION_OPTIONS = [
  { value: 'Brick / RCC', label: 'Brick / RCC' },
  { value: 'RCC', label: 'RCC' },
  { value: 'Brick', label: 'Brick' },
  { value: 'Stone', label: 'Stone' },
  { value: 'Pile foundation', label: 'Pile Foundation' },
  { value: 'Raft foundation', label: 'Raft Foundation' },
  { value: 'Strip foundation', label: 'Strip Foundation' },
];

const PARTITIONS_OPTIONS = [
  { value: 'Brick walls', label: 'Brick Walls' },
  { value: 'Concrete blocks', label: 'Concrete Blocks' },
  { value: 'AAC blocks', label: 'AAC Blocks' },
  { value: 'Plywood partitions', label: 'Plywood Partitions' },
  { value: 'Glass partitions', label: 'Glass Partitions' },
  { value: 'Gypsum partitions', label: 'Gypsum Partitions' },
];

const ROOFING_TERRACING_OPTIONS = [
  { value: 'Mud Phuska', label: 'Mud Phuska' },
  { value: 'Lime Terracing', label: 'Lime Terracing' },
  { value: 'Waterproof treatment', label: 'Waterproof Treatment' },
  { value: 'IPS (Indian Patent Stone)', label: 'IPS (Indian Patent Stone)' },
  { value: 'China mosaic', label: 'China Mosaic' },
  { value: 'Brick bat coba', label: 'Brick Bat Coba' },
  { value: 'Heat insulation treatment', label: 'Heat Insulation Treatment' },
];

const SEWER_DISPOSAL_OPTIONS = [
  { value: 'Public sewer', label: 'Public Sewer' },
  { value: 'Septic tank', label: 'Septic Tank' },
  { value: 'Both public sewer and septic tank', label: 'Both' },
  { value: 'Soak pit', label: 'Soak Pit' },
];

const COMPOUND_WALL_HEIGHT_OPTIONS = [
  { value: '3 ft', label: '3 ft' },
  { value: '4 ft', label: '4 ft' },
  { value: '5 ft', label: '5 ft' },
  { value: '6 ft', label: '6 ft' },
  { value: '7 ft', label: '7 ft' },
  { value: '8 ft', label: '8 ft' },
];

const COMPOUND_WALL_TYPE_OPTIONS = [
  { value: 'Brick masonry', label: 'Brick Masonry' },
  { value: 'RCC', label: 'RCC' },
  { value: 'Stone', label: 'Stone' },
  { value: 'Iron grills', label: 'Iron Grills' },
  { value: 'Wire mesh', label: 'Wire Mesh' },
  { value: 'Brick with iron grills', label: 'Brick with Iron Grills' },
  { value: 'RCC with iron grills', label: 'RCC with Iron Grills' },
];

const EXTERIOR_OPTIONS = [
  { value: '', label: 'Select...' },
  { value: 'Cement plaster with paint', label: 'Cement Plaster with Paint' },
  { value: 'Exterior is of stone with stone railings', label: 'Stone with Stone Railings' },
  { value: 'Texture paint finish', label: 'Texture Paint Finish' },
  { value: 'Tiles cladding', label: 'Tiles Cladding' },
  { value: 'Glass facade', label: 'Glass Facade' },
  { value: 'ACP cladding', label: 'ACP Cladding' },
  { value: 'Exposed brick finish', label: 'Exposed Brick Finish' },
  { value: 'Weather coat paint', label: 'Weather Coat Paint' },
];

export default function ValuationForm({ onGenerate, activeSection, initialData, onDataChange }: ValuationFormProps) {
  // Property Address
  const [propertyNo, setPropertyNo] = useState(initialData?.propertyNo || '');
  const [block, setBlock] = useState(initialData?.block || '');
  const [area, setArea] = useState(initialData?.area || '');
  const [city, setCity] = useState(initialData?.city || '');

  // Boundaries
  const [northBoundary, setNorthBoundary] = useState(initialData?.northBoundary || '');
  const [southBoundary, setSouthBoundary] = useState(initialData?.southBoundary || '');
  const [eastBoundary, setEastBoundary] = useState(initialData?.eastBoundary || '');
  const [westBoundary, setWestBoundary] = useState(initialData?.westBoundary || '');
  const [northEastBoundary, setNorthEastBoundary] = useState(initialData?.northEastBoundary || '');
  const [northWestBoundary, setNorthWestBoundary] = useState(initialData?.northWestBoundary || '');
  const [southEastBoundary, setSouthEastBoundary] = useState(initialData?.southEastBoundary || '');
  const [southWestBoundary, setSouthWestBoundary] = useState(initialData?.southWestBoundary || '');

  // Owner Details
  const [originalOwner, setOriginalOwner] = useState(initialData?.originalOwner || '');
  const [originalOwnerYear, setOriginalOwnerYear] = useState(initialData?.originalOwnerYear || '');
  const [currentOwners, setCurrentOwners] = useState<Owner[]>(initialData?.currentOwners || [{ name: '', share: '' }]);

  // Helper to format date as DD-MM-YYYY (used for default value)
  const formatDateDDMMYYYY = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Valuation Inputs
  const [referenceNo, setReferenceNo] = useState(initialData?.referenceNo || '');
  const [valuationDate, setValuationDate] = useState(initialData?.valuationDate || formatDateDDMMYYYY(new Date()));
  const [valuationForDate, setValuationForDate] = useState(initialData?.valuationForDate || '');
  const [purpose, setPurpose] = useState(initialData?.purpose || '');

  // Land Details
  const [plotArea, setPlotArea] = useState<number>(initialData?.plotArea || 0);
  const [landRatePerSqm, setLandRatePerSqm] = useState<number>(initialData?.landRatePerSqm || 0);
  const [landRateSource, setLandRateSource] = useState(initialData?.landRateSource || '');
  const [locationIncreasePercent, setLocationIncreasePercent] = useState<number>(initialData?.locationIncreasePercent || 0);
  const [landShareFraction, setLandShareFraction] = useState(initialData?.landShareFraction || '');
  const [landShareDecimal, setLandShareDecimal] = useState<number>(initialData?.landShareDecimal || 0);

  // Construction Details
  const [floorArea, setFloorArea] = useState<number>(initialData?.floorArea || 0);
  const [plinthAreaRate, setPlinthAreaRate] = useState<number>(initialData?.plinthAreaRate || 0);
  const [costIndex, setCostIndex] = useState<number>(initialData?.costIndex || 0);
  const [specificationIncreasePercent, setSpecificationIncreasePercent] = useState<number>(initialData?.specificationIncreasePercent || 0);

  // Depreciation
  const [yearOfConstruction, setYearOfConstruction] = useState(initialData?.yearOfConstruction || '');
  const [estimatedLifeYears, setEstimatedLifeYears] = useState<number>(initialData?.estimatedLifeYears || 0);
  const [ageAtValuation, setAgeAtValuation] = useState<number>(initialData?.ageAtValuation || 0);

  // Building Specifications
  const [roof, setRoof] = useState(initialData?.roof || '');
  const [brickwork, setBrickwork] = useState(initialData?.brickwork || '');
  const [flooring, setFlooring] = useState(initialData?.flooring || '');
  const [tiles, setTiles] = useState(initialData?.tiles || '');
  const [electrical, setElectrical] = useState(initialData?.electrical || '');
  const [electricalSwitches, setElectricalSwitches] = useState(initialData?.electricalSwitches || '');
  const [sanitaryFixtures, setSanitaryFixtures] = useState(initialData?.sanitaryFixtures || '');
  const [woodwork, setWoodwork] = useState(initialData?.woodwork || '');
  const [exterior, setExterior] = useState(initialData?.exterior || '');

  // Technical Details
  const [floorHeight, setFloorHeight] = useState(initialData?.floorHeight || '');
  const [constructionType, setConstructionType] = useState(initialData?.constructionType || '');
  const [foundationType, setFoundationType] = useState(initialData?.foundationType || '');
  const [partitions, setPartitions] = useState(initialData?.partitions || '');
  const [roofingTerracing, setRoofingTerracing] = useState(initialData?.roofingTerracing || '');
  const [architecturalFeatures, setArchitecturalFeatures] = useState(initialData?.architecturalFeatures || '');
  const [noOfWaterClosets, setNoOfWaterClosets] = useState<number>(initialData?.noOfWaterClosets || 0);
  const [noOfSinks, setNoOfSinks] = useState<number>(initialData?.noOfSinks || 0);
  const [sanitaryFittingsClass, setSanitaryFittingsClass] = useState(initialData?.sanitaryFittingsClass || '');
  const [compoundWallHeight, setCompoundWallHeight] = useState(initialData?.compoundWallHeight || '');
  const [compoundWallType, setCompoundWallType] = useState(initialData?.compoundWallType || '');
  const [overheadTank, setOverheadTank] = useState(initialData?.overheadTank || '');
  const [noOfPumps, setNoOfPumps] = useState(initialData?.noOfPumps || '');
  const [sewerDisposal, setSewerDisposal] = useState(initialData?.sewerDisposal || '');

  // General Details
  const [propertyType, setPropertyType] = useState(initialData?.propertyType || '');
  const [localityClass, setLocalityClass] = useState(initialData?.localityClass || '');
  const [plotShape, setPlotShape] = useState(initialData?.plotShape || '');
  const [isLeasehold, setIsLeasehold] = useState(initialData?.isLeasehold || false);
  const [buildingOccupancy, setBuildingOccupancy] = useState(initialData?.buildingOccupancy || '');
  const [civicAmenities, setCivicAmenities] = useState<string[]>(initialData?.civicAmenities || []);

  // Photos
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  const [photoPage, setPhotoPage] = useState(0);
  const PHOTOS_PER_PAGE = 6;

  // Location
  const [locationLat, setLocationLat] = useState<number | null>(initialData?.locationLat || null);
  const [locationLng, setLocationLng] = useState<number | null>(initialData?.locationLng || null);
  const [locationCapturedAt, setLocationCapturedAt] = useState(initialData?.locationCapturedAt || '');
  const [locationMapUrl, setLocationMapUrl] = useState(initialData?.locationMapUrl || '');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyA8HFiUeXIbsStOMmjDYKyWc8EyNww5G_s';

  const captureLocation = () => {
    setIsCapturingLocation(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsCapturingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const now = new Date();
        const capturedAt = `${now.toLocaleDateString('en-IN')} at ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

        // Generate Google Maps Static API URL
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=600x400&maptype=roadmap&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;

        setLocationLat(lat);
        setLocationLng(lng);
        setLocationCapturedAt(capturedAt);
        setLocationMapUrl(mapUrl);
        setIsCapturingLocation(false);
      },
      (error) => {
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        setIsCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const clearLocation = () => {
    setLocationLat(null);
    setLocationLng(null);
    setLocationCapturedAt('');
    setLocationMapUrl('');
    setLocationError(null);
  };

  // Sync form data changes to parent for auto-save
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        propertyNo,
        block,
        area,
        city,
        northBoundary,
        southBoundary,
        eastBoundary,
        westBoundary,
        northEastBoundary,
        northWestBoundary,
        southEastBoundary,
        southWestBoundary,
        originalOwner,
        originalOwnerYear,
        currentOwners,
        referenceNo,
        valuationDate,
        valuationForDate,
        purpose,
        plotArea,
        landRatePerSqm,
        landRateSource,
        locationIncreasePercent,
        landShareFraction,
        landShareDecimal,
        floorArea,
        plinthAreaRate,
        costIndex,
        specificationIncreasePercent,
        yearOfConstruction,
        estimatedLifeYears,
        ageAtValuation,
        roof,
        brickwork,
        flooring,
        tiles,
        electrical,
        electricalSwitches,
        sanitaryFixtures,
        woodwork,
        exterior,
        floorHeight,
        constructionType,
        foundationType,
        partitions,
        roofingTerracing,
        architecturalFeatures,
        noOfWaterClosets,
        noOfSinks,
        sanitaryFittingsClass,
        compoundWallHeight,
        compoundWallType,
        overheadTank,
        noOfPumps,
        sewerDisposal,
        propertyType,
        localityClass,
        plotShape,
        isLeasehold,
        buildingOccupancy,
        civicAmenities,
        photos,
        locationLat,
        locationLng,
        locationCapturedAt,
        locationMapUrl,
      });
    }
  }, [
    propertyNo, block, area, city,
    northBoundary, southBoundary, eastBoundary, westBoundary,
    northEastBoundary, northWestBoundary, southEastBoundary, southWestBoundary,
    originalOwner, originalOwnerYear, currentOwners,
    referenceNo, valuationDate, valuationForDate, purpose,
    plotArea, landRatePerSqm, landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal,
    floorArea, plinthAreaRate, costIndex, specificationIncreasePercent,
    yearOfConstruction, estimatedLifeYears, ageAtValuation,
    roof, brickwork, flooring, tiles, electrical, electricalSwitches, sanitaryFixtures, woodwork, exterior,
    floorHeight, constructionType, foundationType, partitions, roofingTerracing, architecturalFeatures,
    noOfWaterClosets, noOfSinks, sanitaryFittingsClass, compoundWallHeight, compoundWallType,
    overheadTank, noOfPumps, sewerDisposal,
    propertyType, localityClass, plotShape, isLeasehold, buildingOccupancy, civicAmenities,
    photos, locationLat, locationLng, locationCapturedAt, locationMapUrl, onDataChange
  ]);

  // Crop image to square
  const cropToSquare = (imageSrc: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const offsetX = (img.width - size) / 2;
          const offsetY = (img.height - size) / 2;
          ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } else {
          resolve(imageSrc);
        }
      };
      img.src = imageSrc;
    });
  };

  const processAndAddPhoto = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const croppedImage = await cropToSquare(reader.result as string);
      setPhotos((prev) => [...prev, croppedImage]);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      processAndAddPhoto(file);
    });
  }, [processAndAddPhoto]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => {
        processAndAddPhoto(file);
      });
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const totalPhotoPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const currentPagePhotos = photos.slice(
    photoPage * PHOTOS_PER_PAGE,
    (photoPage + 1) * PHOTOS_PER_PAGE
  );

  const addOwner = () => setCurrentOwners([...currentOwners, { name: '', share: '' }]);

  const updateOwner = (index: number, field: keyof Owner, value: string) => {
    const updated = [...currentOwners];
    updated[index][field] = value;
    setCurrentOwners(updated);
  };

  const removeOwner = (index: number) => {
    if (currentOwners.length > 1) {
      setCurrentOwners(currentOwners.filter((_, i) => i !== index));
    }
  };

  const removePhoto = (index: number) => setPhotos(photos.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = `PROPERTY NO. ${propertyNo}, BLOCK-${block}, ${area}, ${city}`;
    const valuationInputs = {
      referenceNo, valuationDate, valuationForDate, purpose, plotArea, landRatePerSqm,
      landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal,
      plinthAreaRate, costIndex, specificationIncreasePercent, yearOfConstruction,
      estimatedLifeYears, ageAtValuation,
    };
    const calculatedValues = calculateValues(valuationInputs, floorArea);

    const reportData: ValuationReport = {
      ...DEFAULT_COMPANY_DETAILS,
      propertyAddress: { propertyNo, block, area, city, fullAddress },
      boundaries: {
        north: northBoundary, south: southBoundary, east: eastBoundary, west: westBoundary,
        northEast: northEastBoundary, northWest: northWestBoundary, southEast: southEastBoundary, southWest: southWestBoundary
      },
      originalOwner, originalOwnerYear, currentOwners, valuationInputs,
      floors: [{
        floorName: 'Ground Floor', area: floorArea, height: floorHeight, yearOfConstruction,
        walls: 'Brick walls', doorsWindows: woodwork.includes('Teak') ? 'Teak Wood' : woodwork,
        flooring, finishing: 'Cement sand plaster with POP and Paint finish',
      }],
      technicalDetails: {
        noOfFloors: 'Ground Floor', heightOfFloors: `Ht of Ground floor -${floorHeight}`,
        totalCoveredArea: `GF-${floorArea}Sqm`, yearOfConstruction,
        estimatedLife: `${estimatedLifeYears} years from the year of construction`,
        constructionType, foundationType, partitions, roofingTerracing, architecturalFeatures,
        internalWiring: electrical, fittingsClass: electricalSwitches, noOfWaterClosets, noOfSinks,
        sanitaryFittingsClass, compoundWallHeight, compoundWallType, noOfLifts: 'None',
        undergroundPump: 'None', overheadTank, noOfPumps, roadsPaving: 'N/A', sewerDisposal,
      },
      generalDetails: {
        propertyType, localityClass,
        proximityToCivicAmenities: civicAmenities.length > 0
          ? `${civicAmenities.join(', ')} available nearby`
          : 'All civic amenities available nearby',
        surfaceCommunication: 'By all sort of transport', plotShape, isLeasehold,
        restrictiveCovenants: 'No', easementAgreements: 'No', townPlanningArea: 'Within MC area.',
        developmentContribution: 'No', acquisitionNotification: 'No', buildingOccupancy,
        floorSpaceIndex: 'As per Building Bye-Laws', propertyTax: 'N/A', buildingInsurance: 'N/A',
      },
      buildingSpecs: { roof, brickwork, flooring, tiles, electrical, electricalSwitches, sanitaryFixtures, woodwork, exterior },
      calculatedValues, photos,
      location: locationLat && locationLng ? {
        lat: locationLat,
        lng: locationLng,
        capturedAt: locationCapturedAt,
        mapUrl: locationMapUrl,
      } : undefined,
    };
    onGenerate(reportData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 0: Property Details */}
      {activeSection === 0 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Property Address</h3>
            <div className="grid-2">
              <FormInput label="Property No." value={propertyNo} onChange={(e) => setPropertyNo(e.target.value)} placeholder="e.g., D-44" required />
              <FormInput label="Block" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g., F" required />
              <FormInput label="Area / Colony" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g., TAGORE GARDEN" required />
              <FormSelectWithCustom label="City" options={CITY_OPTIONS} value={city} onChange={setCity} placeholder="Enter city name" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Property Boundaries</h3>
            <div className="grid-2">
              <FormSelectWithCustom label="North" options={BOUNDARY_OPTIONS} value={northBoundary} onChange={setNorthBoundary} placeholder="e.g., Plot No 43" />
              <FormSelectWithCustom label="South" options={BOUNDARY_OPTIONS} value={southBoundary} onChange={setSouthBoundary} placeholder="e.g., Plot No 45" />
              <FormSelectWithCustom label="East" options={BOUNDARY_OPTIONS} value={eastBoundary} onChange={setEastBoundary} placeholder="e.g., Road" />
              <FormSelectWithCustom label="West" options={BOUNDARY_OPTIONS} value={westBoundary} onChange={setWestBoundary} placeholder="e.g., 36' Road" />
              <FormSelectWithCustom label="North-East" options={BOUNDARY_OPTIONS} value={northEastBoundary} onChange={setNorthEastBoundary} placeholder="e.g., Corner Plot" />
              <FormSelectWithCustom label="North-West" options={BOUNDARY_OPTIONS} value={northWestBoundary} onChange={setNorthWestBoundary} placeholder="e.g., Park" />
              <FormSelectWithCustom label="South-East" options={BOUNDARY_OPTIONS} value={southEastBoundary} onChange={setSouthEastBoundary} placeholder="e.g., Lane" />
              <FormSelectWithCustom label="South-West" options={BOUNDARY_OPTIONS} value={southWestBoundary} onChange={setSouthWestBoundary} placeholder="e.g., Open Land" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Property Classification</h3>
            <div className="grid-3">
              <FormSelectWithCustom
                label="Property Type"
                value={propertyType}
                onChange={setPropertyType}
                options={[
                  { value: 'Residential', label: 'Residential' },
                  { value: 'Commercial', label: 'Commercial' },
                  { value: 'Industrial', label: 'Industrial' },
                  { value: 'Mixed', label: 'Mixed Use' },
                  { value: 'Agricultural', label: 'Agricultural' },
                ]}
                placeholder="e.g., Residential"
              />
              <FormSelectWithCustom
                label="Locality Class"
                value={localityClass}
                onChange={setLocalityClass}
                options={[
                  { value: 'High Class', label: 'High Class' },
                  { value: 'Middle Class', label: 'Middle Class' },
                  { value: 'Poor Class', label: 'Poor Class' },
                  { value: 'Premium', label: 'Premium' },
                ]}
                placeholder="e.g., Middle Class"
              />
              <FormSelectWithCustom
                label="Plot Shape"
                value={plotShape}
                onChange={setPlotShape}
                options={[
                  { value: 'Rectangular Plot', label: 'Rectangular' },
                  { value: 'Square Plot', label: 'Square' },
                  { value: 'Irregular Plot', label: 'Irregular' },
                  { value: 'L-Shaped Plot', label: 'L-Shaped' },
                  { value: 'Triangular Plot', label: 'Triangular' },
                ]}
                placeholder="e.g., Rectangular"
              />
              <FormSelectWithCustom
                label="Land Type"
                value={isLeasehold ? 'Leasehold' : 'Freehold'}
                onChange={(val) => setIsLeasehold(val === 'Leasehold')}
                options={[
                  { value: 'Freehold', label: 'Freehold' },
                  { value: 'Leasehold', label: 'Leasehold' },
                ]}
                placeholder="e.g., Freehold"
              />
              <FormSelectWithCustom
                label="Building Occupancy"
                value={buildingOccupancy}
                onChange={setBuildingOccupancy}
                options={[
                  { value: 'Owner occupied', label: 'Owner Occupied' },
                  { value: 'Tenanted', label: 'Tenanted' },
                  { value: 'Vacant', label: 'Vacant' },
                  { value: 'Both', label: 'Both (Owner + Tenant)' },
                ]}
                placeholder="e.g., Owner Occupied"
              />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Nearby Civic Amenities</h3>
            <p className="text-xs lg:text-sm text-text-tertiary mb-2 lg:mb-4">Select all amenities available near the property</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3">
              {[
                { id: 'School', label: 'School' },
                { id: 'Hospital', label: 'Hospital' },
                { id: 'Metro Station', label: 'Metro Station' },
                { id: 'Bus Stand', label: 'Bus Stand' },
                { id: 'Market', label: 'Market' },
                { id: 'Bank', label: 'Bank' },
                { id: 'ATM', label: 'ATM' },
                { id: 'Park', label: 'Park' },
                { id: 'Temple/Religious Place', label: 'Temple/Religious Place' },
                { id: 'Police Station', label: 'Police Station' },
                { id: 'Post Office', label: 'Post Office' },
                { id: 'Petrol Pump', label: 'Petrol Pump' },
              ].map((amenity) => (
                <label
                  key={amenity.id}
                  className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-lg lg:rounded-xl border cursor-pointer transition-all ${
                    civicAmenities.includes(amenity.id)
                      ? 'bg-brand/10 border-brand text-text-primary'
                      : 'bg-surface-100 border-surface-200 text-text-secondary hover:border-surface-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={civicAmenities.includes(amenity.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCivicAmenities([...civicAmenities, amenity.id]);
                      } else {
                        setCivicAmenities(civicAmenities.filter(a => a !== amenity.id));
                      }
                    }}
                    className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded border-surface-300 focus:ring-brand"
                    style={{ accentColor: '#6366f1' }}
                  />
                  <span className="text-xs lg:text-sm">{amenity.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Owner Information */}
      {activeSection === 1 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Original Owner</h3>
            <div className="grid-2">
              <FormInput label="Owner Name" value={originalOwner} onChange={(e) => setOriginalOwner(e.target.value)} placeholder="e.g., SMT RAJ KHURANA" required />
              <FormInput label="Year of Ownership" value={originalOwnerYear} onChange={(e) => setOriginalOwnerYear(e.target.value)} placeholder="e.g., 2001" required />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Current Owners</h3>
            <div className="space-y-4">
              {currentOwners.map((owner, index) => (
                <div key={index} className="owner-card">
                  <div className="flex-1">
                    <label className="form-label">Owner Name</label>
                    <input
                      className="form-input"
                      type="text"
                      value={owner.name}
                      onChange={(e) => updateOwner(index, 'name', e.target.value)}
                      placeholder="e.g., Mrs Renu Khurana"
                      required
                    />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="form-label">Share</label>
                    <input
                      className="form-input"
                      type="text"
                      value={owner.share}
                      onChange={(e) => updateOwner(index, 'share', e.target.value)}
                      placeholder="e.g., 1/4th"
                      required
                    />
                  </div>
                  {currentOwners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeOwner(index)}
                      className="btn btn-danger self-end"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addOwner} className="btn btn-secondary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Another Owner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Valuation Parameters */}
      {activeSection === 2 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Reference Details</h3>
            <div className="grid-3">
              <FormInput label="Reference No." value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g., 19/2025" required />
              <FormDatePicker
                label="Valuation Date"
                value={valuationDate}
                onChange={setValuationDate}
                required
              />
              <FormDatePicker
                label="Valuation For Date"
                value={valuationForDate}
                onChange={setValuationForDate}
                required
              />
            </div>
            <div className="mt-4">
              <FormSelectWithCustom label="Purpose of Valuation" options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose} placeholder="Enter custom purpose" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Land Details</h3>
            <div className="grid-2">
              <FormInput label="Plot Area (Sqm)" type="number" step="0.0001" value={plotArea || ''} onChange={(e) => setPlotArea(parseFloat(e.target.value) || 0)} required />
              <FormInput label="Land Rate (Rs/Sqm)" type="number" value={landRatePerSqm || ''} onChange={(e) => setLandRatePerSqm(parseFloat(e.target.value) || 0)} required />
              <FormSelectWithCustom label="Land Rate Source" options={LAND_RATE_SOURCE_OPTIONS} value={landRateSource} onChange={setLandRateSource} placeholder="e.g., L&DO rates from 1-4-1998" />
              <FormInput label="Location Increase (%)" type="number" value={locationIncreasePercent} onChange={(e) => setLocationIncreasePercent(parseFloat(e.target.value) || 0)} />
              <FormInput label="Land Share Fraction" value={landShareFraction} onChange={(e) => setLandShareFraction(e.target.value)} placeholder="e.g., 1/3" />
              <FormInput label="Land Share Decimal" type="number" step="0.001" value={landShareDecimal} onChange={(e) => setLandShareDecimal(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Construction Details</h3>
            <div className="grid-2">
              <FormInput label="Floor Area (Sqm)" type="number" step="0.001" value={floorArea || ''} onChange={(e) => setFloorArea(parseFloat(e.target.value) || 0)} required />
              <FormInput label="Plinth Area Rate (as on 1.1.92)" type="number" value={plinthAreaRate} onChange={(e) => setPlinthAreaRate(parseFloat(e.target.value) || 0)} />
              <FormInput label="Cost Index" type="number" value={costIndex} onChange={(e) => setCostIndex(parseFloat(e.target.value) || 0)} />
              <FormInput label="Specification Increase (%)" type="number" value={specificationIncreasePercent} onChange={(e) => setSpecificationIncreasePercent(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Depreciation</h3>
            <div className="grid-3">
              <FormInput label="Year of Construction" value={yearOfConstruction} onChange={(e) => setYearOfConstruction(e.target.value)} placeholder="e.g., 1968-69" required />
              <FormInput label="Estimated Life (Years)" type="number" value={estimatedLifeYears} onChange={(e) => setEstimatedLifeYears(parseInt(e.target.value) || 0)} />
              <FormInput label="Age at Valuation (Years)" type="number" value={ageAtValuation} onChange={(e) => setAgeAtValuation(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Live Calculation Preview */}
          {plotArea > 0 && floorArea > 0 && landRatePerSqm > 0 && (
            <div className="calc-preview">
              <h3 className="glass-card-title text-brand">Live Calculation Preview</h3>
              {(() => {
                const calc = calculateValues(
                  { referenceNo, valuationDate, valuationForDate, purpose, plotArea, landRatePerSqm, landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal, plinthAreaRate, costIndex, specificationIncreasePercent, yearOfConstruction, estimatedLifeYears, ageAtValuation },
                  floorArea
                );
                return (
                  <div className="grid grid-cols-2 gap-6 mt-4">
                    <div>
                      <p className="calc-label">Net Land Rate</p>
                      <p className="calc-value">Rs {calc.netLandRate.toFixed(2)}/Sqm</p>
                    </div>
                    <div>
                      <p className="calc-label">Land Share Value</p>
                      <p className="calc-value">Rs {calc.landShareValue.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="calc-label">Construction Cost</p>
                      <p className="calc-value">Rs {calc.costOfConstruction.toLocaleString('en-IN')}</p>
                    </div>
                    <div>
                      <p className="calc-label">Depreciated Value</p>
                      <p className="calc-value">Rs {calc.depreciatedValue.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="col-span-2 pt-5 mt-2 border-t border-[rgba(255,255,255,0.06)]">
                      <p className="calc-label">Total Property Value</p>
                      <p className="calc-total">Rs {calc.roundedValue.toLocaleString('en-IN')}/-</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Building Specifications */}
      {activeSection === 3 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Building Specifications</h3>
            <div className="grid-2">
              <FormSelectWithCustom label="Roof" options={ROOF_OPTIONS} value={roof} onChange={setRoof} placeholder="Enter roof type" />
              <FormSelectWithCustom label="Brickwork" options={BRICKWORK_OPTIONS} value={brickwork} onChange={setBrickwork} placeholder="Enter brickwork type" />
              <FormSelectWithCustom label="Flooring" options={FLOORING_OPTIONS} value={flooring} onChange={setFlooring} placeholder="Enter flooring type" />
              <FormSelectWithCustom label="Tiles" options={TILES_OPTIONS} value={tiles} onChange={setTiles} placeholder="Enter tiles details" />
              <FormSelectWithCustom label="Electrical" options={ELECTRICAL_OPTIONS} value={electrical} onChange={setElectrical} placeholder="Enter electrical type" />
              <FormSelectWithCustom label="Electrical Switches" options={ELECTRICAL_SWITCHES_OPTIONS} value={electricalSwitches} onChange={setElectricalSwitches} placeholder="Enter switches quality" />
              <FormSelectWithCustom label="Sanitary Fixtures" options={SANITARY_FIXTURES_OPTIONS} value={sanitaryFixtures} onChange={setSanitaryFixtures} placeholder="Enter fixtures type" />
              <FormSelectWithCustom label="Woodwork" options={WOODWORK_OPTIONS} value={woodwork} onChange={setWoodwork} placeholder="Enter woodwork details" />
            </div>
            <div className="mt-4">
              <FormSelectWithCustom label="Exterior Finish" options={EXTERIOR_OPTIONS} value={exterior} onChange={setExterior} placeholder="e.g., Exterior is of stone with stone railings" />
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Technical Details */}
      {activeSection === 4 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Construction Details</h3>
            <div className="grid-2">
              <FormSelectWithCustom label="Floor Height" options={FLOOR_HEIGHT_OPTIONS} value={floorHeight} onChange={setFloorHeight} placeholder="e.g., 10 feet 6 inches" />
              <FormSelect label="Construction Type" value={constructionType} onChange={(e) => setConstructionType(e.target.value)} options={[
                { value: '', label: 'Select...' },
                { value: 'Load Bearing', label: 'Load Bearing' },
                { value: 'RCC Frame', label: 'RCC Frame' },
                { value: 'Steel Frame', label: 'Steel Frame' },
                { value: 'Load Bearing + RCC framed', label: 'Load Bearing + RCC Framed' },
              ]} />
              <FormSelectWithCustom label="Foundation Type" options={FOUNDATION_OPTIONS} value={foundationType} onChange={setFoundationType} placeholder="Enter foundation type" />
              <FormSelectWithCustom label="Partitions" options={PARTITIONS_OPTIONS} value={partitions} onChange={setPartitions} placeholder="Enter partition type" />
              <FormSelectWithCustom label="Roofing & Terracing" options={ROOFING_TERRACING_OPTIONS} value={roofingTerracing} onChange={setRoofingTerracing} placeholder="Enter roofing details" />
              <FormInput label="Architectural Features" value={architecturalFeatures} onChange={(e) => setArchitecturalFeatures(e.target.value)} placeholder="e.g., Stone exterior with railing" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Sanitary & Utilities</h3>
            <div className="grid-2">
              <FormInput label="No. of Water Closets" type="number" value={noOfWaterClosets} onChange={(e) => setNoOfWaterClosets(parseInt(e.target.value) || 0)} />
              <FormInput label="No. of Sinks" type="number" value={noOfSinks} onChange={(e) => setNoOfSinks(parseInt(e.target.value) || 0)} />
              <FormSelect label="Sanitary Fittings Class" value={sanitaryFittingsClass} onChange={(e) => setSanitaryFittingsClass(e.target.value)} options={[
                { value: '', label: 'Select...' },
                { value: 'Superior coloured', label: 'Superior Coloured' },
                { value: 'Superior white', label: 'Superior White' },
                { value: 'Superior', label: 'Superior' },
                { value: 'Ordinary', label: 'Ordinary' },
              ]} />
              <FormInput label="Overhead Tank" value={overheadTank} onChange={(e) => setOverheadTank(e.target.value)} placeholder="e.g., 2 tanks of 500L each" />
              <FormInput label="No. of Pumps" value={noOfPumps} onChange={(e) => setNoOfPumps(e.target.value)} placeholder="e.g., 1, 1HP" />
              <FormSelectWithCustom label="Sewer Disposal" options={SEWER_DISPOSAL_OPTIONS} value={sewerDisposal} onChange={setSewerDisposal} placeholder="Enter sewer disposal type" />
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">Compound Wall</h3>
            <div className="grid-2">
              <FormSelectWithCustom label="Height" options={COMPOUND_WALL_HEIGHT_OPTIONS} value={compoundWallHeight} onChange={setCompoundWallHeight} placeholder="e.g., 5 ft" />
              <FormSelectWithCustom label="Type" options={COMPOUND_WALL_TYPE_OPTIONS} value={compoundWallType} onChange={setCompoundWallType} placeholder="Enter wall type" />
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Photos */}
      {activeSection === 5 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Property Photos</h3>

            {/* Upload options - using labels for better mobile compatibility */}
            <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4 lg:mb-6">
              {/* Camera Button - Using label for reliable mobile camera access */}
              <label className="flex flex-col items-center justify-center gap-1.5 lg:gap-2 p-3 lg:p-5 bg-gradient-to-br from-brand/20 to-brand/5 border-2 border-brand/40 rounded-xl lg:rounded-2xl hover:border-brand hover:from-brand/30 hover:to-brand/10 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-brand/20 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-7 lg:h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs lg:text-sm font-semibold text-text-primary">Camera</p>
                  <p className="text-[10px] lg:text-xs text-text-tertiary hidden sm:block">Take photo</p>
                </div>
              </label>

              {/* Gallery Button - Using label for reliable mobile gallery access */}
              <label className="flex flex-col items-center justify-center gap-1.5 lg:gap-2 p-3 lg:p-5 border-2 border-surface-300 rounded-xl lg:rounded-2xl hover:border-text-tertiary hover:bg-surface-200/30 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-surface-200 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-7 lg:h-7 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs lg:text-sm font-semibold text-text-primary">Gallery</p>
                  <p className="text-[10px] lg:text-xs text-text-tertiary hidden sm:block">Choose photos</p>
                </div>
              </label>

              {/* Upload/Drop Button - For desktop drag & drop */}
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center gap-1.5 lg:gap-2 p-3 lg:p-5 border-2 border-dashed rounded-xl lg:rounded-2xl cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? 'border-brand bg-brand/10'
                    : 'border-surface-300 hover:border-text-tertiary hover:bg-surface-200/30'
                }`}
              >
                <input {...getInputProps()} />
                <div className="w-9 h-9 lg:w-12 lg:h-12 rounded-lg lg:rounded-xl bg-surface-200 flex items-center justify-center">
                  <svg className="w-5 h-5 lg:w-7 lg:h-7 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs lg:text-sm font-semibold text-text-primary">
                    {isDragActive ? 'Drop here' : 'Files'}
                  </p>
                  <p className="text-[10px] lg:text-xs text-text-tertiary hidden sm:block">Drag or browse</p>
                </div>
              </div>
            </div>

            {/* Photo Grid - 2x3 layout */}
            {photos.length > 0 && (
              <div className="mt-4 lg:mt-6">
                <div className="flex items-center justify-between mb-2 lg:mb-4">
                  <p className="text-xs lg:text-sm text-text-secondary">
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} added
                    {totalPhotoPages > 1 && (
                      <span className="text-text-tertiary ml-1 lg:ml-2">
                        ({photoPage + 1}/{totalPhotoPages})
                      </span>
                    )}
                  </p>
                  {totalPhotoPages > 1 && (
                    <div className="flex items-center gap-1.5 lg:gap-2">
                      <button
                        type="button"
                        onClick={() => setPhotoPage(Math.max(0, photoPage - 1))}
                        disabled={photoPage === 0}
                        className="p-1.5 lg:p-2 rounded-lg bg-surface-200 hover:bg-surface-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoPage(Math.min(totalPhotoPages - 1, photoPage + 1))}
                        disabled={photoPage >= totalPhotoPages - 1}
                        className="p-1.5 lg:p-2 rounded-lg bg-surface-200 hover:bg-surface-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* 2x3 Grid for square photos */}
                <div className="grid grid-cols-2 gap-2 lg:gap-4">
                  {currentPagePhotos.map((photo, index) => {
                    const actualIndex = photoPage * PHOTOS_PER_PAGE + index;
                    return (
                      <div
                        key={actualIndex}
                        className="relative aspect-square rounded-lg lg:rounded-xl overflow-hidden border-2 border-surface-200 hover:border-brand/50 transition-colors group"
                      >
                        <img
                          src={photo}
                          alt={`Property ${actualIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-1.5 left-1.5 lg:bottom-2 lg:left-2 text-[10px] lg:text-xs text-white font-medium opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          Photo {actualIndex + 1}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(actualIndex)}
                          className="absolute top-1.5 right-1.5 lg:top-2 lg:right-2 p-1.5 lg:p-2 rounded-md lg:rounded-lg bg-black/50 text-white opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:bg-red-500 transition-all"
                        >
                          <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Page indicator dots */}
                {totalPhotoPages > 1 && (
                  <div className="flex justify-center gap-1.5 lg:gap-2 mt-3 lg:mt-4">
                    {Array.from({ length: totalPhotoPages }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPhotoPage(i)}
                        className={`w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full transition-all ${
                          i === photoPage
                            ? 'w-4 lg:w-6 bg-brand'
                            : 'bg-surface-300 hover:bg-text-tertiary'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Info text */}
                <p className="text-[10px] lg:text-xs text-text-tertiary text-center mt-3 lg:mt-4">
                  Photos auto-cropped to square. 6 per page in report.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Section 6: Location */}
      {activeSection === 6 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">Property Location</h3>
            <p className="text-xs lg:text-sm text-text-tertiary mb-3 lg:mb-4">
              Capture GPS coordinates when at the property for the location map in the report
            </p>

            {!locationLat ? (
              <div className="text-center py-6 lg:py-8">
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={isCapturingLocation}
                  className="inline-flex items-center gap-2 lg:gap-3 px-5 lg:px-6 py-3 lg:py-4 bg-gradient-to-br from-brand/20 to-brand/5 border-2 border-brand/40 rounded-xl lg:rounded-2xl hover:border-brand hover:from-brand/30 hover:to-brand/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  {isCapturingLocation ? (
                    <>
                      <svg className="animate-spin w-5 h-5 lg:w-6 lg:h-6 text-brand" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm lg:text-base font-medium text-text-primary">Getting Location...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 lg:w-6 lg:h-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm lg:text-base font-medium text-text-primary">Capture Current Location</span>
                    </>
                  )}
                </button>

                {locationError && (
                  <p className="text-xs lg:text-sm text-red-400 mt-3">{locationError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Map Preview */}
                <div className="relative rounded-xl overflow-hidden border-2 border-surface-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={locationMapUrl}
                    alt="Property Location Map"
                    className="w-full h-48 lg:h-64 object-cover bg-surface-200"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `
                        <div class="w-full h-48 lg:h-64 flex items-center justify-center bg-surface-200 text-text-tertiary">
                          <div class="text-center">
                            <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                            </svg>
                            <p class="text-sm">Map preview unavailable</p>
                            <p class="text-xs mt-1">Location coordinates saved</p>
                          </div>
                        </div>
                      `;
                    }}
                  />
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white hover:bg-red-500 transition-all"
                    title="Remove location"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Coordinates */}
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <div className="p-3 lg:p-4 bg-surface-100 rounded-lg lg:rounded-xl border border-surface-200">
                    <p className="text-[10px] lg:text-xs text-text-tertiary uppercase tracking-wide mb-1">Latitude</p>
                    <p className="text-sm lg:text-base font-mono font-medium text-text-primary">{locationLat?.toFixed(6)}° N</p>
                  </div>
                  <div className="p-3 lg:p-4 bg-surface-100 rounded-lg lg:rounded-xl border border-surface-200">
                    <p className="text-[10px] lg:text-xs text-text-tertiary uppercase tracking-wide mb-1">Longitude</p>
                    <p className="text-sm lg:text-base font-mono font-medium text-text-primary">{locationLng?.toFixed(6)}° E</p>
                  </div>
                </div>

                <p className="text-[10px] lg:text-xs text-text-tertiary text-center">
                  Captured on {locationCapturedAt}
                </p>

                {/* Recapture button */}
                <button
                  type="button"
                  onClick={captureLocation}
                  disabled={isCapturingLocation}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-surface-200 text-text-secondary hover:bg-surface-300 transition-colors text-xs lg:text-sm font-medium disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recapture Location
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
