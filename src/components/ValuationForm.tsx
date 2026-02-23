'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import {
  ValuationReport,
  Owner,
  DEFAULT_COMPANY_DETAILS,
  calculateValues,
} from '@/types/valuation';
import { ReportFormData } from '@/types/report';
import { useFirm } from '@/contexts/FirmContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadReportPhoto } from '@/lib/photo-storage';
import SwipeableField from './SwipeableField';
// SwipeHint removed — fields now use toggle icon instead of swipe
import HiddenFieldsModal from './HiddenFieldsModal';

interface ValuationFormProps {
  onGenerate: (data: ValuationReport) => void;
  isGenerating: boolean;
  activeSection: number;
  setActiveSection: (section: number) => void;
  initialData?: ReportFormData;
  onDataChange?: (data: ReportFormData) => void;
  reportId?: string;
}

// Reusable Input Component
const FormInput = ({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="form-group">
    <label className="form-label">{label}{props.required && <span className="text-red-400 ml-0.5">*</span>}</label>
    <input
      className="form-input"
      placeholder=" "
      {...props}
      {...(props.type === 'number' ? { inputMode: 'decimal' as const } : {})}
    />
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
      <div className="grid grid-cols-7 px-2 pb-2 gap-0.5">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="min-w-[36px] min-h-[36px]" />
        ))}
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => handleSelectDate(day)}
            className={`min-w-[36px] min-h-[36px] rounded-lg text-sm font-medium transition-all ${
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

  // Use native date picker on mobile touch devices
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 768;

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nativeValue = e.target.value; // YYYY-MM-DD
    if (nativeValue) {
      const [y, m, d] = nativeValue.split('-');
      onChange(`${d}-${m}-${y}`);
    }
  };

  // Convert DD-MM-YYYY to YYYY-MM-DD for native input
  const nativeDateValue = (() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return '';
  })();

  return (
    <div className="form-group" ref={containerRef}>
      <label className="form-label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div ref={inputRef}>
        {isTouchDevice ? (
          <input
            className="form-input"
            type="date"
            value={nativeDateValue}
            onChange={handleNativeDateChange}
            required={required}
          />
        ) : (
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
        )}
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
    <label className="form-label">{label}{props.required && <span className="text-red-400 ml-0.5">*</span>}</label>
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
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 240; // max-h-60 = 240px
        const flipUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        setPosition({
          top: flipUp ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
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

  // Check if mobile touch device — use native select for better UX
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const useNativeSelect = isMobile && isTouchDevice && options.length <= 15;

  const handleArrowClick = () => {
    setIsOpen(!isOpen);
    setIsSearching(false); // Show all options when clicking button
    // On mobile, blur the input to hide keyboard when opening dropdown
    if (isMobile && !isOpen) {
      const input = containerRef.current?.querySelector('input');
      input?.blur();
    }
  };

  if (useNativeSelect) {
    return (
      <div className="form-group" ref={containerRef}>
        <label className="form-label">{label}</label>
        <select
          className={`form-select ${value ? 'filled' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options.filter(opt => opt.value).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

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
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          />
          <button
            type="button"
            onClick={handleArrowClick}
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

const BANK_OPTIONS = [
  { value: 'State Bank of India', label: 'SBI' },
  { value: 'Punjab National Bank', label: 'PNB' },
  { value: 'Bank of Baroda', label: 'Bank of Baroda' },
  { value: 'Canara Bank', label: 'Canara Bank' },
  { value: 'Union Bank of India', label: 'Union Bank' },
  { value: 'Bank of India', label: 'Bank of India' },
  { value: 'Indian Bank', label: 'Indian Bank' },
  { value: 'Central Bank of India', label: 'Central Bank' },
  { value: 'Indian Overseas Bank', label: 'IOB' },
  { value: 'UCO Bank', label: 'UCO Bank' },
  { value: 'HDFC Bank', label: 'HDFC Bank' },
  { value: 'ICICI Bank', label: 'ICICI Bank' },
  { value: 'Axis Bank', label: 'Axis Bank' },
  { value: 'Kotak Mahindra Bank', label: 'Kotak Mahindra' },
  { value: 'Yes Bank', label: 'Yes Bank' },
  { value: 'IDFC First Bank', label: 'IDFC First' },
  { value: 'Bandhan Bank', label: 'Bandhan Bank' },
  { value: 'Federal Bank', label: 'Federal Bank' },
  { value: 'LIC Housing Finance', label: 'LIC HFL' },
  { value: 'HDFC Ltd', label: 'HDFC Ltd' },
  { value: 'PNB Housing Finance', label: 'PNB Housing' },
  { value: 'Bajaj Housing Finance', label: 'Bajaj Housing' },
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

export default function ValuationForm({ onGenerate, activeSection, initialData, onDataChange, reportId }: ValuationFormProps) {
  const { firm } = useFirm();
  const { t } = useLanguage();
  const firmId = firm?.id;

  // Property Address (single free-form field)
  const [propertyAddress, setPropertyAddress] = useState(initialData?.propertyAddress || '');

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
  const [bankName, setBankName] = useState(initialData?.bankName || '');
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

  // Auto-compute landShareDecimal when fraction matches X/Y pattern
  useEffect(() => {
    const match = landShareFraction.match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
    if (match) {
      const numerator = parseFloat(match[1]);
      const denominator = parseFloat(match[2]);
      if (denominator !== 0) {
        const decimal = parseFloat((numerator / denominator).toFixed(6));
        setLandShareDecimal(decimal);
      }
    }
  }, [landShareFraction]);

  // Portion Being Valued
  const [portionValued, setPortionValued] = useState(initialData?.portionValued || '');

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

  // Additional Property Details
  const [nearbyLandmark, setNearbyLandmark] = useState(initialData?.nearbyLandmark || '');
  const [landType, setLandType] = useState(initialData?.landType || '');
  const [accessApproach, setAccessApproach] = useState(initialData?.accessApproach || '');
  const [abutingRoads, setAbutingRoads] = useState(initialData?.abutingRoads || '');
  const [plinthArea, setPlinthArea] = useState<number>(initialData?.plinthArea || 0);
  const [carpetArea, setCarpetArea] = useState<number>(initialData?.carpetArea || 0);
  const [saleableArea, setSaleableArea] = useState<number>(initialData?.saleableArea || 0);

  // Additional Owner Details
  const [ownerPhone, setOwnerPhone] = useState(initialData?.ownerPhone || '');
  const [developerName, setDeveloperName] = useState(initialData?.developerName || '');
  const [inspectionDate, setInspectionDate] = useState(initialData?.inspectionDate || '');

  // Legal & Regulatory
  const [ownershipDocType, setOwnershipDocType] = useState(initialData?.ownershipDocType || '');
  const [leaseholdRestrictions, setLeaseholdRestrictions] = useState(initialData?.leaseholdRestrictions || '');
  const [easementAgreement, setEasementAgreement] = useState(initialData?.easementAgreement || '');
  const [acquisitionNotification, setAcquisitionNotification] = useState(initialData?.acquisitionNotification || '');
  const [roadWideningNotification, setRoadWideningNotification] = useState(initialData?.roadWideningNotification || '');
  const [heritageRestriction, setHeritageRestriction] = useState(initialData?.heritageRestriction || '');
  const [encumbrances, setEncumbrances] = useState(initialData?.encumbrances || '');
  const [buildingPlanSanction, setBuildingPlanSanction] = useState(initialData?.buildingPlanSanction || '');
  const [approvalAuthority, setApprovalAuthority] = useState(initialData?.approvalAuthority || '');
  const [planViolations, setPlanViolations] = useState(initialData?.planViolations || '');
  const [occupancyCertificateStatus, setOccupancyCertificateStatus] = useState(initialData?.occupancyCertificateStatus || '');
  const [unauthorizedConstructions, setUnauthorizedConstructions] = useState(initialData?.unauthorizedConstructions || '');
  const [farFsiPermitted, setFarFsiPermitted] = useState(initialData?.farFsiPermitted || '');
  const [farFsiConsumed, setFarFsiConsumed] = useState(initialData?.farFsiConsumed || '');
  const [groundCoverage, setGroundCoverage] = useState(initialData?.groundCoverage || '');
  const [planningZone, setPlanningZone] = useState(initialData?.planningZone || '');
  const [zoningRegulations, setZoningRegulations] = useState(initialData?.zoningRegulations || '');
  const [surroundingLandUse, setSurroundingLandUse] = useState(initialData?.surroundingLandUse || '');
  const [demolitionProceedings, setDemolitionProceedings] = useState(initialData?.demolitionProceedings || '');
  const [sarfaesiCompliant, setSarfaesiCompliant] = useState(initialData?.sarfaesiCompliant || '');

  // Economic/Rental Details
  const [reasonableLettingValue, setReasonableLettingValue] = useState<number>(initialData?.reasonableLettingValue || 0);
  const [isOccupiedByTenant, setIsOccupiedByTenant] = useState(initialData?.isOccupiedByTenant || false);
  const [numberOfTenants, setNumberOfTenants] = useState<number>(initialData?.numberOfTenants || 0);
  const [tenancyDuration, setTenancyDuration] = useState(initialData?.tenancyDuration || '');
  const [tenancyStatus, setTenancyStatus] = useState(initialData?.tenancyStatus || '');
  const [monthlyRent, setMonthlyRent] = useState<number>(initialData?.monthlyRent || 0);
  const [propertyTaxStatus, setPropertyTaxStatus] = useState(initialData?.propertyTaxStatus || '');
  const [propertyInsurance, setPropertyInsurance] = useState(initialData?.propertyInsurance || '');
  const [maintenanceCharges, setMaintenanceCharges] = useState<number>(initialData?.maintenanceCharges || 0);
  const [securityCharges, setSecurityCharges] = useState<number>(initialData?.securityCharges || 0);

  // Infrastructure
  const [waterSupply, setWaterSupply] = useState(initialData?.waterSupply || '');
  const [sewerageSystem, setSewerageSystem] = useState(initialData?.sewerageSystem || '');
  const [stormDrainage, setStormDrainage] = useState(initialData?.stormDrainage || '');
  const [solidWasteManagement, setSolidWasteManagement] = useState(initialData?.solidWasteManagement || '');
  const [electricityStatus, setElectricityStatus] = useState(initialData?.electricityStatus || '');
  const [publicTransportAccess, setPublicTransportAccess] = useState(initialData?.publicTransportAccess || '');
  const [nearbySchool, setNearbySchool] = useState(initialData?.nearbySchool || '');
  const [nearbyMedical, setNearbyMedical] = useState(initialData?.nearbyMedical || '');
  const [nearbyRecreation, setNearbyRecreation] = useState(initialData?.nearbyRecreation || '');

  // Environmental
  const [greenBuildingFeatures, setGreenBuildingFeatures] = useState(initialData?.greenBuildingFeatures || '');
  const [rainWaterHarvesting, setRainWaterHarvesting] = useState(initialData?.rainWaterHarvesting || '');
  const [solarProvision, setSolarProvision] = useState(initialData?.solarProvision || '');
  const [environmentalPollution, setEnvironmentalPollution] = useState(initialData?.environmentalPollution || '');

  // Engineering/Safety
  const [structuralSafety, setStructuralSafety] = useState(initialData?.structuralSafety || '');
  const [earthquakeResistance, setEarthquakeResistance] = useState(initialData?.earthquakeResistance || '');
  const [visibleDamage, setVisibleDamage] = useState(initialData?.visibleDamage || '');
  const [airConditioningSystem, setAirConditioningSystem] = useState(initialData?.airConditioningSystem || '');
  const [firefightingProvision, setFirefightingProvision] = useState(initialData?.firefightingProvision || '');
  const [maintenanceIssues, setMaintenanceIssues] = useState(initialData?.maintenanceIssues || '');
  const [extentOfDeterioration, setExtentOfDeterioration] = useState(initialData?.extentOfDeterioration || '');

  // Architectural
  const [architecturalStyle, setArchitecturalStyle] = useState(initialData?.architecturalStyle || '');
  const [heritageValue, setHeritageValue] = useState(initialData?.heritageValue || '');
  const [landscapeElements, setLandscapeElements] = useState(initialData?.landscapeElements || '');

  // Marketability
  const [locationAttributes, setLocationAttributes] = useState(initialData?.locationAttributes || '');
  const [scarcityValue, setScarcityValue] = useState(initialData?.scarcityValue || '');
  const [demandSupplyComment, setDemandSupplyComment] = useState(initialData?.demandSupplyComment || '');
  const [comparableSalePrices, setComparableSalePrices] = useState(initialData?.comparableSalePrices || '');
  const [lastTwoTransactions, setLastTwoTransactions] = useState(initialData?.lastTwoTransactions || '');

  // Valuation Summary
  const [guidelineValueLand, setGuidelineValueLand] = useState<number>(initialData?.guidelineValueLand || 0);
  const [guidelineValueBuilding, setGuidelineValueBuilding] = useState<number>(initialData?.guidelineValueBuilding || 0);
  const [marketRateTrend, setMarketRateTrend] = useState(initialData?.marketRateTrend || '');
  const [forcedSaleValue, setForcedSaleValue] = useState<number>(initialData?.forcedSaleValue || 0);
  const [insuranceValue, setInsuranceValue] = useState<number>(initialData?.insuranceValue || 0);
  const [valuationMethodology, setValuationMethodology] = useState(initialData?.valuationMethodology || '');
  const [variationJustification, setVariationJustification] = useState(initialData?.variationJustification || '');

  // Photos (stored as Firebase Storage URLs)
  const [photos, setPhotos] = useState<string[]>(initialData?.photos || []);
  const [photoPage, setPhotoPage] = useState(0);
  const [uploadingPhotos, setUploadingPhotos] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState<File[]>([]);
  const PHOTOS_PER_PAGE = 6;
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Location
  const [locationLat, setLocationLat] = useState<number | null>(initialData?.locationLat || null);
  const [locationLng, setLocationLng] = useState<number | null>(initialData?.locationLng || null);
  const [locationCapturedAt, setLocationCapturedAt] = useState(initialData?.locationCapturedAt || '');
  const [locationMapUrl, setLocationMapUrl] = useState(initialData?.locationMapUrl || '');
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Hidden fields state (for toggle-to-hide feature)
  const [hiddenFields, setHiddenFields] = useState<string[]>(initialData?.hiddenFields || []);
  const [showHiddenFieldsModal, setShowHiddenFieldsModal] = useState(false);
  const [hideToast, setHideToast] = useState<{ fieldName: string; visible: boolean } | null>(null);
  const hideToastTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Hidden field handlers
  const handleHideField = useCallback((fieldName: string) => {
    setHiddenFields(prev => [...prev, fieldName]);
    // Show toast with undo
    if (hideToastTimeoutRef.current) clearTimeout(hideToastTimeoutRef.current);
    setHideToast({ fieldName, visible: true });
    hideToastTimeoutRef.current = setTimeout(() => {
      setHideToast(null);
    }, 4000);
  }, []);

  const handleRestoreField = useCallback((fieldName: string) => {
    setHiddenFields(prev => prev.filter(f => f !== fieldName));
  }, []);

  const handleRestoreAllFields = useCallback(() => {
    setHiddenFields([]);
    setShowHiddenFieldsModal(false);
  }, []);

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
        templateId: initialData?.templateId || 'custom',
        propertyAddress,
        nearbyLandmark,
        landType,
        accessApproach,
        abutingRoads,
        plinthArea,
        carpetArea,
        saleableArea,
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
        ownerPhone,
        currentOwners,
        developerName,
        referenceNo,
        bankName,
        inspectionDate,
        valuationDate,
        valuationForDate,
        purpose,
        plotArea,
        landRatePerSqm,
        landRateSource,
        locationIncreasePercent,
        landShareFraction,
        landShareDecimal,
        portionValued,
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
        // Legal & Regulatory
        ownershipDocType,
        leaseholdRestrictions,
        easementAgreement,
        acquisitionNotification,
        roadWideningNotification,
        heritageRestriction,
        encumbrances,
        buildingPlanSanction,
        approvalAuthority,
        planViolations,
        occupancyCertificateStatus,
        unauthorizedConstructions,
        farFsiPermitted,
        farFsiConsumed,
        groundCoverage,
        planningZone,
        zoningRegulations,
        surroundingLandUse,
        demolitionProceedings,
        sarfaesiCompliant,
        // Economic/Rental
        reasonableLettingValue,
        isOccupiedByTenant,
        numberOfTenants,
        tenancyDuration,
        tenancyStatus,
        monthlyRent,
        propertyTaxStatus,
        propertyInsurance,
        maintenanceCharges,
        securityCharges,
        // Infrastructure
        waterSupply,
        sewerageSystem,
        stormDrainage,
        solidWasteManagement,
        electricityStatus,
        publicTransportAccess,
        nearbySchool,
        nearbyMedical,
        nearbyRecreation,
        // Environmental
        greenBuildingFeatures,
        rainWaterHarvesting,
        solarProvision,
        environmentalPollution,
        // Engineering/Safety
        structuralSafety,
        earthquakeResistance,
        visibleDamage,
        airConditioningSystem,
        firefightingProvision,
        maintenanceIssues,
        extentOfDeterioration,
        // Architectural
        architecturalStyle,
        heritageValue,
        landscapeElements,
        // Marketability
        locationAttributes,
        scarcityValue,
        demandSupplyComment,
        comparableSalePrices,
        lastTwoTransactions,
        // Valuation Summary
        guidelineValueLand,
        guidelineValueBuilding,
        marketRateTrend,
        forcedSaleValue,
        insuranceValue,
        valuationMethodology,
        variationJustification,
        // Photos & Location
        photos,
        locationLat,
        locationLng,
        locationCapturedAt,
        locationMapUrl,
        // Hidden fields
        hiddenFields,
      });
    }
  }, [
    propertyAddress, nearbyLandmark,
    landType, accessApproach, abutingRoads, plinthArea, carpetArea, saleableArea,
    northBoundary, southBoundary, eastBoundary, westBoundary,
    northEastBoundary, northWestBoundary, southEastBoundary, southWestBoundary,
    originalOwner, originalOwnerYear, ownerPhone, currentOwners, developerName,
    referenceNo, bankName, inspectionDate, valuationDate, valuationForDate, purpose,
    plotArea, landRatePerSqm, landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal,
    portionValued, floorArea, plinthAreaRate, costIndex, specificationIncreasePercent,
    yearOfConstruction, estimatedLifeYears, ageAtValuation,
    roof, brickwork, flooring, tiles, electrical, electricalSwitches, sanitaryFixtures, woodwork, exterior,
    floorHeight, constructionType, foundationType, partitions, roofingTerracing, architecturalFeatures,
    noOfWaterClosets, noOfSinks, sanitaryFittingsClass, compoundWallHeight, compoundWallType,
    overheadTank, noOfPumps, sewerDisposal,
    propertyType, localityClass, plotShape, isLeasehold, buildingOccupancy, civicAmenities,
    ownershipDocType, leaseholdRestrictions, easementAgreement, acquisitionNotification, roadWideningNotification,
    heritageRestriction, encumbrances, buildingPlanSanction, approvalAuthority, planViolations,
    occupancyCertificateStatus, unauthorizedConstructions, farFsiPermitted, farFsiConsumed, groundCoverage,
    planningZone, zoningRegulations, surroundingLandUse, demolitionProceedings, sarfaesiCompliant,
    reasonableLettingValue, isOccupiedByTenant, numberOfTenants, tenancyDuration, tenancyStatus, monthlyRent,
    propertyTaxStatus, propertyInsurance, maintenanceCharges, securityCharges,
    waterSupply, sewerageSystem, stormDrainage, solidWasteManagement, electricityStatus, publicTransportAccess,
    nearbySchool, nearbyMedical, nearbyRecreation,
    greenBuildingFeatures, rainWaterHarvesting, solarProvision, environmentalPollution,
    structuralSafety, earthquakeResistance, visibleDamage, airConditioningSystem, firefightingProvision,
    maintenanceIssues, extentOfDeterioration, architecturalStyle, heritageValue, landscapeElements,
    locationAttributes, scarcityValue, demandSupplyComment, comparableSalePrices, lastTwoTransactions,
    guidelineValueLand, guidelineValueBuilding, marketRateTrend, forcedSaleValue, insuranceValue,
    valuationMethodology, variationJustification,
    photos, locationLat, locationLng, locationCapturedAt, locationMapUrl,
    hiddenFields, onDataChange
  ]);

  // ── Photo upload ──────────────────────────────────────────────────────
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState('');

  const processAndAddPhoto = useCallback(async (file: File) => {
    if (!firmId || !reportId) {
      setPhotoError('Report not ready — please wait and try again.');
      return;
    }
    setPhotoError(null);
    setUploadStage('Starting...');
    setUploadingPhotos((n) => n + 1);
    try {
      const url = await uploadReportPhoto(firmId, reportId, file, setUploadStage);
      setPhotos((prev) => [...prev, url]);
      setFailedPhotos((prev) => prev.filter((f) => f !== file));
      setUploadStage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setPhotoError(msg);
      setUploadStage('');
      setFailedPhotos((prev) => prev.some((f) => f === file) ? prev : [...prev, file]);
    } finally {
      setUploadingPhotos((n) => n - 1);
    }
  }, [firmId, reportId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) await processAndAddPhoto(file);
  }, [processAndAddPhoto]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic', '.heif'] },
  });

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    for (const file of files) await processAndAddPhoto(file);
    // Reset AFTER processing — some Android browsers invalidate Files on early reset
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  }, [processAndAddPhoto]);

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

  const movePhoto = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    const newPhotos = [...photos];
    [newPhotos[index], newPhotos[newIndex]] = [newPhotos[newIndex], newPhotos[index]];
    setPhotos(newPhotos);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullAddress = propertyAddress.trim();
    const valuationInputs = {
      referenceNo, bankName, valuationDate, valuationForDate, purpose, plotArea, landRatePerSqm,
      landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal,
      plinthAreaRate, costIndex, specificationIncreasePercent, yearOfConstruction,
      estimatedLifeYears, ageAtValuation,
    };
    const calculatedValues = calculateValues(valuationInputs, floorArea);

    // Use firm branding if available, fall back to defaults
    const branding = firm?.branding;
    const companyDetails = branding?.firmName ? {
      companyName: branding.firmName,
      companySubtitle: branding.subtitle || '',
      companyAddress: branding.address || '',
      companyContact: branding.contact || '',
      companyEmail: branding.email || '',
      valuerName: DEFAULT_COMPANY_DETAILS.valuerName,
      valuerQualification: DEFAULT_COMPANY_DETAILS.valuerQualification,
      valuerDesignation: DEFAULT_COMPANY_DETAILS.valuerDesignation,
      valuerCategoryNo: DEFAULT_COMPANY_DETAILS.valuerCategoryNo,
    } : DEFAULT_COMPANY_DETAILS;

    const reportData: ValuationReport = {
      ...companyDetails,
      propertyAddress: { fullAddress },
      boundaries: {
        north: northBoundary, south: southBoundary, east: eastBoundary, west: westBoundary,
        northEast: northEastBoundary, northWest: northWestBoundary, southEast: southEastBoundary, southWest: southWestBoundary
      },
      originalOwner, originalOwnerYear, currentOwners, valuationInputs,
      floors: [{
        floorName: portionValued || 'Ground Floor', area: floorArea, height: floorHeight, yearOfConstruction,
        walls: 'Brick walls', doorsWindows: woodwork.includes('Teak') ? 'Teak Wood' : woodwork,
        flooring, finishing: 'Cement sand plaster with POP and Paint finish',
      }],
      technicalDetails: {
        noOfFloors: portionValued || 'Ground Floor', heightOfFloors: `Ht of ${portionValued || 'Ground floor'} -${floorHeight}`,
        totalCoveredArea: `${portionValued || 'GF'}-${floorArea}Sqm`, yearOfConstruction,
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
      templateId: initialData?.templateId || 'custom',
      extendedData: {
        encumbrances, buildingPlanSanction, approvalAuthority, planViolations,
        occupancyCertificateStatus, unauthorizedConstructions, sarfaesiCompliant,
        farFsiPermitted, farFsiConsumed, groundCoverage,
        isOccupiedByTenant, numberOfTenants, monthlyRent, tenancyDuration,
        tenancyStatus, reasonableLettingValue,
        locationAttributes, comparableSalePrices, demandSupplyComment,
        lastTwoTransactions, marketRateTrend,
        guidelineValueLand, guidelineValueBuilding, forcedSaleValue,
        insuranceValue, variationJustification, valuationMethodology,
      },
    };
    onGenerate(reportData);
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 0: Property Details */}
      {activeSection === 0 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">{t('propertyAddress')}</h3>
            <div className="space-y-4">
              <SwipeableField fieldName="propertyAddress" isHidden={hiddenFields.includes('propertyAddress')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Property Address <span className="text-red-400">*</span></label>
                  <textarea
                    className="form-input min-h-[80px] resize-y"
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    placeholder="e.g., Property No. D-44, Block-F, Tagore Garden, New Delhi - 110027"
                    rows={3}
                    required
                  />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="nearbyLandmark" isHidden={hiddenFields.includes('nearbyLandmark')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Nearby Landmark" value={nearbyLandmark} onChange={(e) => setNearbyLandmark(e.target.value)} placeholder="e.g., Near Metro Station" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('physicalCharacteristics')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="landType" isHidden={hiddenFields.includes('landType')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Land Type"
                  value={landType}
                  onChange={setLandType}
                  options={[
                    { value: 'Solid/Firm', label: 'Solid/Firm' },
                    { value: 'Rocky', label: 'Rocky' },
                    { value: 'Sandy', label: 'Sandy' },
                    { value: 'Clay/Black Cotton', label: 'Clay/Black Cotton Soil' },
                    { value: 'Alluvial', label: 'Alluvial' },
                    { value: 'Marsh Land', label: 'Marsh Land' },
                    { value: 'Reclaimed Land', label: 'Reclaimed Land' },
                    { value: 'Water-logged', label: 'Water-logged' },
                    { value: 'Land-locked', label: 'Land-locked' },
                    { value: 'Hilly/Sloping', label: 'Hilly/Sloping' },
                    { value: 'Gullied/Ravenous', label: 'Gullied/Ravenous' },
                    { value: 'Barren/Stony', label: 'Barren/Stony' },
                  ]}
                  placeholder="Type of land"
                />
              </SwipeableField>
              <SwipeableField fieldName="accessApproach" isHidden={hiddenFields.includes('accessApproach')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Access / Approach" value={accessApproach} onChange={(e) => setAccessApproach(e.target.value)} placeholder="e.g., Direct road access" />
              </SwipeableField>
              <SwipeableField fieldName="abutingRoads" isHidden={hiddenFields.includes('abutingRoads')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Abutting Roads" value={abutingRoads} onChange={(e) => setAbutingRoads(e.target.value)} placeholder="e.g., 30ft road on East" />
              </SwipeableField>
            </div>
            <div className="grid-3 mt-4">
              <SwipeableField fieldName="plinthArea" isHidden={hiddenFields.includes('plinthArea')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Plinth Area (sq.m.)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={plinthArea || ''} onChange={(e) => setPlinthArea(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="carpetArea" isHidden={hiddenFields.includes('carpetArea')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Carpet Area (sq.m.)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={carpetArea || ''} onChange={(e) => setCarpetArea(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="saleableArea" isHidden={hiddenFields.includes('saleableArea')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Saleable Area (sq.m.)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={saleableArea || ''} onChange={(e) => setSaleableArea(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('propertyBoundaries')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="northBoundary" isHidden={hiddenFields.includes('northBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="North" options={BOUNDARY_OPTIONS} value={northBoundary} onChange={setNorthBoundary} placeholder="e.g., Plot No 43" />
              </SwipeableField>
              <SwipeableField fieldName="southBoundary" isHidden={hiddenFields.includes('southBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="South" options={BOUNDARY_OPTIONS} value={southBoundary} onChange={setSouthBoundary} placeholder="e.g., Plot No 45" />
              </SwipeableField>
              <SwipeableField fieldName="eastBoundary" isHidden={hiddenFields.includes('eastBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="East" options={BOUNDARY_OPTIONS} value={eastBoundary} onChange={setEastBoundary} placeholder="e.g., Road" />
              </SwipeableField>
              <SwipeableField fieldName="westBoundary" isHidden={hiddenFields.includes('westBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="West" options={BOUNDARY_OPTIONS} value={westBoundary} onChange={setWestBoundary} placeholder="e.g., 36' Road" />
              </SwipeableField>
              <SwipeableField fieldName="northEastBoundary" isHidden={hiddenFields.includes('northEastBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="North-East" options={BOUNDARY_OPTIONS} value={northEastBoundary} onChange={setNorthEastBoundary} placeholder="e.g., Corner Plot" />
              </SwipeableField>
              <SwipeableField fieldName="northWestBoundary" isHidden={hiddenFields.includes('northWestBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="North-West" options={BOUNDARY_OPTIONS} value={northWestBoundary} onChange={setNorthWestBoundary} placeholder="e.g., Park" />
              </SwipeableField>
              <SwipeableField fieldName="southEastBoundary" isHidden={hiddenFields.includes('southEastBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="South-East" options={BOUNDARY_OPTIONS} value={southEastBoundary} onChange={setSouthEastBoundary} placeholder="e.g., Lane" />
              </SwipeableField>
              <SwipeableField fieldName="southWestBoundary" isHidden={hiddenFields.includes('southWestBoundary')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="South-West" options={BOUNDARY_OPTIONS} value={southWestBoundary} onChange={setSouthWestBoundary} placeholder="e.g., Open Land" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('propertyClassification')}</h3>
            <div className="grid-3">
              <SwipeableField fieldName="propertyType" isHidden={hiddenFields.includes('propertyType')} onHide={handleHideField} onRestore={handleRestoreField}>
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
              </SwipeableField>
              <SwipeableField fieldName="portionValued" isHidden={hiddenFields.includes('portionValued')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Portion Being Valued"
                  value={portionValued}
                  onChange={setPortionValued}
                  options={[
                    { value: 'Ground Floor', label: 'Ground Floor' },
                    { value: 'First Floor', label: 'First Floor' },
                    { value: 'Second Floor', label: 'Second Floor' },
                    { value: 'Ground + First Floor', label: 'Ground + First Floor' },
                    { value: 'Entire Building', label: 'Entire Building' },
                    { value: 'Flat/Apartment', label: 'Flat/Apartment' },
                    { value: 'Villa/Independent House', label: 'Villa/Independent House' },
                  ]}
                  placeholder="e.g., Ground Floor"
                />
              </SwipeableField>
              <SwipeableField fieldName="localityClass" isHidden={hiddenFields.includes('localityClass')} onHide={handleHideField} onRestore={handleRestoreField}>
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
              </SwipeableField>
              <SwipeableField fieldName="plotShape" isHidden={hiddenFields.includes('plotShape')} onHide={handleHideField} onRestore={handleRestoreField}>
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
              </SwipeableField>
              <SwipeableField fieldName="isLeasehold" isHidden={hiddenFields.includes('isLeasehold')} onHide={handleHideField} onRestore={handleRestoreField}>
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
              </SwipeableField>
              <SwipeableField fieldName="buildingOccupancy" isHidden={hiddenFields.includes('buildingOccupancy')} onHide={handleHideField} onRestore={handleRestoreField}>
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
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('nearbyCivicAmenities')}</h3>
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
            <h3 className="glass-card-title">{t('originalOwner')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="originalOwner" isHidden={hiddenFields.includes('originalOwner')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Owner Name" value={originalOwner} onChange={(e) => setOriginalOwner(e.target.value)} placeholder="e.g., SMT RAJ KHURANA" required />
              </SwipeableField>
              <SwipeableField fieldName="originalOwnerYear" isHidden={hiddenFields.includes('originalOwnerYear')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Year of Ownership" value={originalOwnerYear} onChange={(e) => setOriginalOwnerYear(e.target.value)} placeholder="e.g., 2001" required />
              </SwipeableField>
              <SwipeableField fieldName="ownerPhone" isHidden={hiddenFields.includes('ownerPhone')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Phone Number" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="e.g., 9811741187" />
              </SwipeableField>
              <SwipeableField fieldName="developerName" isHidden={hiddenFields.includes('developerName')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Developer Name (if applicable)" value={developerName} onChange={(e) => setDeveloperName(e.target.value)} placeholder="e.g., DLF Ltd." />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('currentOwners')}</h3>
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
            <h3 className="glass-card-title">{t('referenceDetails')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="referenceNo" isHidden={hiddenFields.includes('referenceNo')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Reference No." value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g., 19/2025" required />
              </SwipeableField>
              <SwipeableField fieldName="bankName" isHidden={hiddenFields.includes('bankName')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Bank / Institution Name" options={BANK_OPTIONS} value={bankName} onChange={setBankName} placeholder="Enter bank name" />
              </SwipeableField>
              <SwipeableField fieldName="inspectionDate" isHidden={hiddenFields.includes('inspectionDate')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormDatePicker
                  label="Date of Inspection"
                  value={inspectionDate}
                  onChange={setInspectionDate}
                />
              </SwipeableField>
              <SwipeableField fieldName="valuationDate" isHidden={hiddenFields.includes('valuationDate')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormDatePicker
                  label="Date of Valuation Report"
                  value={valuationDate}
                  onChange={setValuationDate}
                  required
                />
              </SwipeableField>
              <SwipeableField fieldName="valuationForDate" isHidden={hiddenFields.includes('valuationForDate')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormDatePicker
                  label="Valuation For Date"
                  value={valuationForDate}
                  onChange={setValuationForDate}
                  required
                />
              </SwipeableField>
            </div>
            <div className="mt-4">
              <SwipeableField fieldName="purpose" isHidden={hiddenFields.includes('purpose')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Purpose of Valuation" options={PURPOSE_OPTIONS} value={purpose} onChange={setPurpose} placeholder="Enter custom purpose" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('landDetails')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="plotArea" isHidden={hiddenFields.includes('plotArea')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Plot Area (Sqm)" type="number" step="0.0001" value={plotArea || ''} onChange={(e) => setPlotArea(parseFloat(e.target.value) || 0)} required />
              </SwipeableField>
              <SwipeableField fieldName="landRatePerSqm" isHidden={hiddenFields.includes('landRatePerSqm')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Land Rate (Rs/Sqm)" type="number" value={landRatePerSqm || ''} onChange={(e) => setLandRatePerSqm(parseFloat(e.target.value) || 0)} required />
              </SwipeableField>
              <SwipeableField fieldName="landRateSource" isHidden={hiddenFields.includes('landRateSource')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Land Rate Source" options={LAND_RATE_SOURCE_OPTIONS} value={landRateSource} onChange={setLandRateSource} placeholder="e.g., L&DO rates from 1-4-1998" />
              </SwipeableField>
              <SwipeableField fieldName="locationIncreasePercent" isHidden={hiddenFields.includes('locationIncreasePercent')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Location Increase (%)" type="number" value={locationIncreasePercent} onChange={(e) => setLocationIncreasePercent(parseFloat(e.target.value) || 0)} />
              </SwipeableField>
              <SwipeableField fieldName="landShareFraction" isHidden={hiddenFields.includes('landShareFraction')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Land Share Fraction" value={landShareFraction} onChange={(e) => setLandShareFraction(e.target.value)} placeholder="e.g., 1/3" />
              </SwipeableField>
              <SwipeableField fieldName="landShareDecimal" isHidden={hiddenFields.includes('landShareDecimal')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Land Share Decimal" type="number" step="0.001" value={landShareDecimal} onChange={(e) => setLandShareDecimal(parseFloat(e.target.value) || 0)} />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('constructionDetails')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="floorArea" isHidden={hiddenFields.includes('floorArea')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Floor Area (Sqm)" type="number" step="0.001" value={floorArea || ''} onChange={(e) => setFloorArea(parseFloat(e.target.value) || 0)} required />
              </SwipeableField>
              <SwipeableField fieldName="plinthAreaRate" isHidden={hiddenFields.includes('plinthAreaRate')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Plinth Area Rate (as on 1.1.92)" type="number" value={plinthAreaRate} onChange={(e) => setPlinthAreaRate(parseFloat(e.target.value) || 0)} />
              </SwipeableField>
              <SwipeableField fieldName="costIndex" isHidden={hiddenFields.includes('costIndex')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Cost Index" type="number" value={costIndex} onChange={(e) => setCostIndex(parseFloat(e.target.value) || 0)} />
              </SwipeableField>
              <SwipeableField fieldName="specificationIncreasePercent" isHidden={hiddenFields.includes('specificationIncreasePercent')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Specification Increase (%)" type="number" value={specificationIncreasePercent} onChange={(e) => setSpecificationIncreasePercent(parseFloat(e.target.value) || 0)} />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('depreciation')}</h3>
            <div className="grid-3">
              <SwipeableField fieldName="yearOfConstruction" isHidden={hiddenFields.includes('yearOfConstruction')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Year of Construction" value={yearOfConstruction} onChange={(e) => setYearOfConstruction(e.target.value)} placeholder="e.g., 1968-69" required />
              </SwipeableField>
              <SwipeableField fieldName="estimatedLifeYears" isHidden={hiddenFields.includes('estimatedLifeYears')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Estimated Life (Years)" type="number" value={estimatedLifeYears} onChange={(e) => setEstimatedLifeYears(parseInt(e.target.value) || 0)} />
              </SwipeableField>
              <SwipeableField fieldName="ageAtValuation" isHidden={hiddenFields.includes('ageAtValuation')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Age at Valuation (Years)" type="number" value={ageAtValuation} onChange={(e) => setAgeAtValuation(parseInt(e.target.value) || 0)} />
              </SwipeableField>
            </div>
          </div>

          {/* Live Calculation Preview */}
          {plotArea > 0 && floorArea > 0 && landRatePerSqm > 0 && (
            <div className="calc-preview">
              <h3 className="glass-card-title text-brand">{t('liveCalcPreview')}</h3>
              {(() => {
                const calc = calculateValues(
                  { referenceNo, bankName, valuationDate, valuationForDate, purpose, plotArea, landRatePerSqm, landRateSource, locationIncreasePercent, landShareFraction, landShareDecimal, plinthAreaRate, costIndex, specificationIncreasePercent, yearOfConstruction, estimatedLifeYears, ageAtValuation },
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

          <div className="glass-card">
            <h3 className="glass-card-title">{t('marketabilityAssessment')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="locationAttributes" isHidden={hiddenFields.includes('locationAttributes')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Location Attributes"
                  value={locationAttributes}
                  onChange={setLocationAttributes}
                  options={[
                    { value: 'Prime Location', label: 'Prime Location' },
                    { value: 'Well Connected', label: 'Well Connected' },
                    { value: 'Developing Area', label: 'Developing Area' },
                    { value: 'Established Locality', label: 'Established Locality' },
                    { value: 'Remote/Outskirts', label: 'Remote/Outskirts' },
                    { value: 'Near Commercial Hub', label: 'Near Commercial Hub' },
                    { value: 'Near IT Park', label: 'Near IT Park' },
                    { value: 'Near Industrial Area', label: 'Near Industrial Area' },
                  ]}
                  placeholder="Location quality"
                />
              </SwipeableField>
              <SwipeableField fieldName="scarcityValue" isHidden={hiddenFields.includes('scarcityValue')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Scarcity Value"
                  value={scarcityValue}
                  onChange={setScarcityValue}
                  options={[
                    { value: 'Very High', label: 'Very High (Limited Land)' },
                    { value: 'High', label: 'High Demand' },
                    { value: 'Moderate', label: 'Moderate' },
                    { value: 'Low', label: 'Low (Ample Supply)' },
                    { value: 'None', label: 'None' },
                  ]}
                  placeholder="Scarcity value"
                />
              </SwipeableField>
              <SwipeableField fieldName="demandSupplyComment" isHidden={hiddenFields.includes('demandSupplyComment')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Demand & Supply"
                  value={demandSupplyComment}
                  onChange={setDemandSupplyComment}
                  options={[
                    { value: 'High Demand, Low Supply', label: 'High Demand, Low Supply' },
                    { value: 'High Demand, Moderate Supply', label: 'High Demand, Moderate Supply' },
                    { value: 'Moderate Demand & Supply', label: 'Moderate Demand & Supply' },
                    { value: 'Low Demand, High Supply', label: 'Low Demand, High Supply' },
                    { value: 'Stagnant Market', label: 'Stagnant Market' },
                    { value: 'Emerging Market', label: 'Emerging Market' },
                  ]}
                  placeholder="Market status"
                />
              </SwipeableField>
              <SwipeableField fieldName="comparableSalePrices" isHidden={hiddenFields.includes('comparableSalePrices')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Comparable Sale Prices" value={comparableSalePrices} onChange={(e) => setComparableSalePrices(e.target.value)} placeholder="e.g., Rs 15-18 Cr nearby" />
              </SwipeableField>
            </div>
            <div className="mt-4">
              <SwipeableField fieldName="lastTwoTransactions" isHidden={hiddenFields.includes('lastTwoTransactions')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Last Two Transactions in Locality</label>
                  <textarea
                    className="form-input min-h-[80px]"
                    value={lastTwoTransactions}
                    onChange={(e) => setLastTwoTransactions(e.target.value)}
                    placeholder="e.g., 1. Plot D-42 sold at Rs 16 Cr in Jan 2024&#10;2. Plot D-46 sold at Rs 14.5 Cr in Nov 2023"
                  />
                </div>
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('valuationSummary')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="guidelineValueLand" isHidden={hiddenFields.includes('guidelineValueLand')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Guideline Value - Land (Rs)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={guidelineValueLand || ''} onChange={(e) => setGuidelineValueLand(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="guidelineValueBuilding" isHidden={hiddenFields.includes('guidelineValueBuilding')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Guideline Value - Building (Rs)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={guidelineValueBuilding || ''} onChange={(e) => setGuidelineValueBuilding(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="marketRateTrend" isHidden={hiddenFields.includes('marketRateTrend')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Market Rate Trend"
                  value={marketRateTrend}
                  onChange={setMarketRateTrend}
                  options={[
                    { value: 'Increasing (>10% YoY)', label: 'Increasing (>10% YoY)' },
                    { value: 'Moderately Increasing (5-10%)', label: 'Moderately Increasing (5-10%)' },
                    { value: 'Stable', label: 'Stable' },
                    { value: 'Moderately Declining', label: 'Moderately Declining' },
                    { value: 'Declining', label: 'Declining' },
                    { value: 'Volatile', label: 'Volatile' },
                  ]}
                  placeholder="Market trend"
                />
              </SwipeableField>
              <SwipeableField fieldName="forcedSaleValue" isHidden={hiddenFields.includes('forcedSaleValue')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Forced/Distress Sale Value (Rs)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={forcedSaleValue || ''} onChange={(e) => setForcedSaleValue(Number(e.target.value))} placeholder="75% of market value" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="insuranceValue" isHidden={hiddenFields.includes('insuranceValue')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Insurance Value (Rs)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={insuranceValue || ''} onChange={(e) => setInsuranceValue(Number(e.target.value))} placeholder="Construction cost" />
                </div>
              </SwipeableField>
            </div>
            <div className="mt-4">
              <SwipeableField fieldName="valuationMethodology" isHidden={hiddenFields.includes('valuationMethodology')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Valuation Methodology"
                  value={valuationMethodology}
                  onChange={setValuationMethodology}
                  options={[
                    { value: 'Land & Building Method', label: 'Land & Building Method' },
                    { value: 'Comparable Sales Method', label: 'Comparable Sales Method' },
                    { value: 'Income Capitalization Method', label: 'Income Capitalization Method' },
                    { value: 'Residual Method', label: 'Residual Method' },
                    { value: 'Cost Approach (Depreciated Replacement Cost)', label: 'Cost Approach (DRC)' },
                    { value: 'Discounted Cash Flow Method', label: 'Discounted Cash Flow (DCF)' },
                    { value: 'Rental Capitalization Method', label: 'Rental Capitalization Method' },
                    { value: 'Combination of Methods', label: 'Combination of Methods' },
                  ]}
                  placeholder="Select or enter methodology"
                />
              </SwipeableField>
            </div>
            <div className="mt-4">
              <SwipeableField fieldName="variationJustification" isHidden={hiddenFields.includes('variationJustification')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Variation Justification (if &gt;20% from Guideline)</label>
                  <textarea
                    className="form-input min-h-[60px]"
                    value={variationJustification}
                    onChange={(e) => setVariationJustification(e.target.value)}
                    placeholder="If variation is 20% or more from guideline value, provide justification..."
                  />
                </div>
              </SwipeableField>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Building Specifications */}
      {activeSection === 3 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">{t('buildingSpecifications')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="roof" isHidden={hiddenFields.includes('roof')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Roof" options={ROOF_OPTIONS} value={roof} onChange={setRoof} placeholder="Enter roof type" />
              </SwipeableField>
              <SwipeableField fieldName="brickwork" isHidden={hiddenFields.includes('brickwork')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Brickwork" options={BRICKWORK_OPTIONS} value={brickwork} onChange={setBrickwork} placeholder="Enter brickwork type" />
              </SwipeableField>
              <SwipeableField fieldName="flooring" isHidden={hiddenFields.includes('flooring')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Flooring" options={FLOORING_OPTIONS} value={flooring} onChange={setFlooring} placeholder="Enter flooring type" />
              </SwipeableField>
              <SwipeableField fieldName="tiles" isHidden={hiddenFields.includes('tiles')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Tiles" options={TILES_OPTIONS} value={tiles} onChange={setTiles} placeholder="Enter tiles details" />
              </SwipeableField>
              <SwipeableField fieldName="electrical" isHidden={hiddenFields.includes('electrical')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Electrical" options={ELECTRICAL_OPTIONS} value={electrical} onChange={setElectrical} placeholder="Enter electrical type" />
              </SwipeableField>
              <SwipeableField fieldName="electricalSwitches" isHidden={hiddenFields.includes('electricalSwitches')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Electrical Switches" options={ELECTRICAL_SWITCHES_OPTIONS} value={electricalSwitches} onChange={setElectricalSwitches} placeholder="Enter switches quality" />
              </SwipeableField>
              <SwipeableField fieldName="sanitaryFixtures" isHidden={hiddenFields.includes('sanitaryFixtures')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Sanitary Fixtures" options={SANITARY_FIXTURES_OPTIONS} value={sanitaryFixtures} onChange={setSanitaryFixtures} placeholder="Enter fixtures type" />
              </SwipeableField>
              <SwipeableField fieldName="woodwork" isHidden={hiddenFields.includes('woodwork')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Woodwork" options={WOODWORK_OPTIONS} value={woodwork} onChange={setWoodwork} placeholder="Enter woodwork details" />
              </SwipeableField>
            </div>
            <div className="mt-4">
              <SwipeableField fieldName="exterior" isHidden={hiddenFields.includes('exterior')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Exterior Finish" options={EXTERIOR_OPTIONS} value={exterior} onChange={setExterior} placeholder="e.g., Exterior is of stone with stone railings" />
              </SwipeableField>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Technical Details */}
      {activeSection === 4 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">{t('constructionDetails')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="floorHeight" isHidden={hiddenFields.includes('floorHeight')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Floor Height" options={FLOOR_HEIGHT_OPTIONS} value={floorHeight} onChange={setFloorHeight} placeholder="e.g., 10 feet 6 inches" />
              </SwipeableField>
              <SwipeableField fieldName="constructionType" isHidden={hiddenFields.includes('constructionType')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelect label="Construction Type" value={constructionType} onChange={(e) => setConstructionType(e.target.value)} options={[
                  { value: '', label: 'Select...' },
                  { value: 'Load Bearing', label: 'Load Bearing' },
                  { value: 'RCC Frame', label: 'RCC Frame Structure' },
                  { value: 'RCC Frame with Shear Walls', label: 'RCC Frame with Shear Walls' },
                  { value: 'Steel Frame', label: 'Steel Frame Structure' },
                  { value: 'Load Bearing + RCC framed', label: 'Load Bearing + RCC Framed' },
                  { value: 'Prefabricated/LGSF', label: 'Prefabricated/LGSF' },
                  { value: 'Composite', label: 'Composite (Steel + Concrete)' },
                  { value: 'Mud/Kaccha', label: 'Mud/Kaccha Construction' },
                  { value: 'Timber Frame', label: 'Timber Frame' },
                ]} />
              </SwipeableField>
              <SwipeableField fieldName="foundationType" isHidden={hiddenFields.includes('foundationType')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Foundation Type" options={FOUNDATION_OPTIONS} value={foundationType} onChange={setFoundationType} placeholder="Enter foundation type" />
              </SwipeableField>
              <SwipeableField fieldName="partitions" isHidden={hiddenFields.includes('partitions')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Partitions" options={PARTITIONS_OPTIONS} value={partitions} onChange={setPartitions} placeholder="Enter partition type" />
              </SwipeableField>
              <SwipeableField fieldName="roofingTerracing" isHidden={hiddenFields.includes('roofingTerracing')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Roofing & Terracing" options={ROOFING_TERRACING_OPTIONS} value={roofingTerracing} onChange={setRoofingTerracing} placeholder="Enter roofing details" />
              </SwipeableField>
              <SwipeableField fieldName="architecturalFeatures" isHidden={hiddenFields.includes('architecturalFeatures')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Architectural Features" value={architecturalFeatures} onChange={(e) => setArchitecturalFeatures(e.target.value)} placeholder="e.g., Stone exterior with railing" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('sanitaryUtilities')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="noOfWaterClosets" isHidden={hiddenFields.includes('noOfWaterClosets')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="No. of Water Closets" type="number" value={noOfWaterClosets} onChange={(e) => setNoOfWaterClosets(parseInt(e.target.value) || 0)} />
              </SwipeableField>
              <SwipeableField fieldName="noOfSinks" isHidden={hiddenFields.includes('noOfSinks')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="No. of Sinks" type="number" value={noOfSinks} onChange={(e) => setNoOfSinks(parseInt(e.target.value) || 0)} />
              </SwipeableField>
              <SwipeableField fieldName="sanitaryFittingsClass" isHidden={hiddenFields.includes('sanitaryFittingsClass')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelect label="Sanitary Fittings Class" value={sanitaryFittingsClass} onChange={(e) => setSanitaryFittingsClass(e.target.value)} options={[
                  { value: '', label: 'Select...' },
                  { value: 'Superior coloured', label: 'Superior Coloured' },
                  { value: 'Superior white', label: 'Superior White' },
                  { value: 'Superior', label: 'Superior' },
                  { value: 'Ordinary', label: 'Ordinary' },
                ]} />
              </SwipeableField>
              <SwipeableField fieldName="overheadTank" isHidden={hiddenFields.includes('overheadTank')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Overhead Tank" value={overheadTank} onChange={(e) => setOverheadTank(e.target.value)} placeholder="e.g., 2 tanks of 500L each" />
              </SwipeableField>
              <SwipeableField fieldName="noOfPumps" isHidden={hiddenFields.includes('noOfPumps')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="No. of Pumps" value={noOfPumps} onChange={(e) => setNoOfPumps(e.target.value)} placeholder="e.g., 1, 1HP" />
              </SwipeableField>
              <SwipeableField fieldName="sewerDisposal" isHidden={hiddenFields.includes('sewerDisposal')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Sewer Disposal" options={SEWER_DISPOSAL_OPTIONS} value={sewerDisposal} onChange={setSewerDisposal} placeholder="Enter sewer disposal type" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('compoundWall')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="compoundWallHeight" isHidden={hiddenFields.includes('compoundWallHeight')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Height" options={COMPOUND_WALL_HEIGHT_OPTIONS} value={compoundWallHeight} onChange={setCompoundWallHeight} placeholder="e.g., 5 ft" />
              </SwipeableField>
              <SwipeableField fieldName="compoundWallType" isHidden={hiddenFields.includes('compoundWallType')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom label="Type" options={COMPOUND_WALL_TYPE_OPTIONS} value={compoundWallType} onChange={setCompoundWallType} placeholder="Enter wall type" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('legalRegulatory')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="ownershipDocType" isHidden={hiddenFields.includes('ownershipDocType')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Ownership Document Type"
                  value={ownershipDocType}
                  onChange={setOwnershipDocType}
                  options={[
                    { value: 'Sale Deed', label: 'Sale Deed' },
                    { value: 'Conveyance Deed', label: 'Conveyance Deed' },
                    { value: 'Gift Deed', label: 'Gift Deed' },
                    { value: 'Lease Deed', label: 'Lease Deed' },
                    { value: 'Perpetual Lease Deed', label: 'Perpetual Lease Deed' },
                    { value: 'Will', label: 'Will' },
                    { value: 'Succession Certificate', label: 'Succession Certificate' },
                    { value: 'Partition Deed', label: 'Partition Deed' },
                    { value: 'Relinquishment Deed', label: 'Relinquishment Deed' },
                    { value: 'Exchange Deed', label: 'Exchange Deed' },
                    { value: 'Settlement Deed', label: 'Settlement Deed' },
                    { value: 'Agreement to Sell', label: 'Agreement to Sell' },
                    { value: 'Power of Attorney', label: 'Power of Attorney (GPA/SPA)' },
                    { value: 'Allotment Letter', label: 'Allotment Letter' },
                    { value: 'Patta/Khata', label: 'Patta/Khata' },
                  ]}
                  placeholder="Select document type"
                />
              </SwipeableField>
              <SwipeableField fieldName="occupancyCertificateStatus" isHidden={hiddenFields.includes('occupancyCertificateStatus')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Occupancy Certificate Status"
                  value={occupancyCertificateStatus}
                  onChange={setOccupancyCertificateStatus}
                  options={[
                    { value: 'Issued', label: 'Issued' },
                    { value: 'Not Issued', label: 'Not Issued' },
                    { value: 'Applied', label: 'Applied' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="OC Status"
                />
              </SwipeableField>
              <SwipeableField fieldName="buildingPlanSanction" isHidden={hiddenFields.includes('buildingPlanSanction')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Building Plan Sanction" value={buildingPlanSanction} onChange={(e) => setBuildingPlanSanction(e.target.value)} placeholder="e.g., Sanctioned by MCD" />
              </SwipeableField>
              <SwipeableField fieldName="approvalAuthority" isHidden={hiddenFields.includes('approvalAuthority')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Approval Authority" value={approvalAuthority} onChange={(e) => setApprovalAuthority(e.target.value)} placeholder="e.g., MCD / DDA" />
              </SwipeableField>
              <SwipeableField fieldName="planViolations" isHidden={hiddenFields.includes('planViolations')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Plan Violations (if any)" value={planViolations} onChange={(e) => setPlanViolations(e.target.value)} placeholder="e.g., None observed" />
              </SwipeableField>
              <SwipeableField fieldName="unauthorizedConstructions" isHidden={hiddenFields.includes('unauthorizedConstructions')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Unauthorized Constructions" value={unauthorizedConstructions} onChange={(e) => setUnauthorizedConstructions(e.target.value)} placeholder="e.g., Nil / Covered balcony" />
              </SwipeableField>
              <SwipeableField fieldName="farFsiPermitted" isHidden={hiddenFields.includes('farFsiPermitted')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="FAR/FSI Permitted" value={farFsiPermitted} onChange={(e) => setFarFsiPermitted(e.target.value)} placeholder="e.g., 3.5" />
              </SwipeableField>
              <SwipeableField fieldName="farFsiConsumed" isHidden={hiddenFields.includes('farFsiConsumed')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="FAR/FSI Consumed" value={farFsiConsumed} onChange={(e) => setFarFsiConsumed(e.target.value)} placeholder="e.g., 2.8" />
              </SwipeableField>
              <SwipeableField fieldName="groundCoverage" isHidden={hiddenFields.includes('groundCoverage')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Ground Coverage (%)" value={groundCoverage} onChange={(e) => setGroundCoverage(e.target.value)} placeholder="e.g., 80%" />
              </SwipeableField>
              <SwipeableField fieldName="sarfaesiCompliant" isHidden={hiddenFields.includes('sarfaesiCompliant')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="SARFAESI Compliant"
                  value={sarfaesiCompliant}
                  onChange={setSarfaesiCompliant}
                  options={[
                    { value: 'Yes - Fully Compliant', label: 'Yes - Fully Compliant' },
                    { value: 'Yes - Subject to Clear Title', label: 'Yes - Subject to Clear Title' },
                    { value: 'Yes - Agricultural Land Converted', label: 'Yes - Agricultural Land Converted' },
                    { value: 'No - Agricultural Land', label: 'No - Agricultural Land' },
                    { value: 'No - Below Threshold', label: 'No - Below ₹1 Lakh Threshold' },
                    { value: 'No - Disputed Property', label: 'No - Disputed Property' },
                    { value: 'No - Encumbered', label: 'No - Encumbered' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="SARFAESI status"
                />
              </SwipeableField>
              <SwipeableField fieldName="encumbrances" isHidden={hiddenFields.includes('encumbrances')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Encumbrances (if any)" value={encumbrances} onChange={(e) => setEncumbrances(e.target.value)} placeholder="e.g., None / Mortgage with bank" />
              </SwipeableField>
              <SwipeableField fieldName="heritageRestriction" isHidden={hiddenFields.includes('heritageRestriction')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormInput label="Heritage Restriction" value={heritageRestriction} onChange={(e) => setHeritageRestriction(e.target.value)} placeholder="e.g., None" />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('infrastructureUtilities')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="waterSupply" isHidden={hiddenFields.includes('waterSupply')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Water Supply"
                  value={waterSupply}
                  onChange={setWaterSupply}
                  options={[
                    { value: 'Municipal (Piped)', label: 'Municipal (Piped)' },
                    { value: 'Borewell/Tubewell', label: 'Borewell/Tubewell' },
                    { value: 'Municipal + Borewell', label: 'Municipal + Borewell' },
                    { value: 'Tanker Supply', label: 'Tanker Supply' },
                    { value: 'Open Well', label: 'Open Well' },
                    { value: 'Hand Pump', label: 'Hand Pump' },
                    { value: 'Water Treatment Plant', label: 'Water Treatment Plant' },
                    { value: 'River/Canal', label: 'River/Canal' },
                    { value: 'Rainwater Only', label: 'Rainwater Only' },
                    { value: 'Not Available', label: 'Not Available' },
                  ]}
                  placeholder="Water source"
                />
              </SwipeableField>
              <SwipeableField fieldName="sewerageSystem" isHidden={hiddenFields.includes('sewerageSystem')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Sewerage System"
                  value={sewerageSystem}
                  onChange={setSewerageSystem}
                  options={[
                    { value: 'Underground Municipal', label: 'Underground Municipal' },
                    { value: 'Septic Tank', label: 'Septic Tank' },
                    { value: 'Septic Tank + Soak Pit', label: 'Septic Tank + Soak Pit' },
                    { value: 'STP (Sewage Treatment Plant)', label: 'STP (Sewage Treatment Plant)' },
                    { value: 'Open Drain', label: 'Open Drain' },
                    { value: 'Bio-digester', label: 'Bio-digester' },
                    { value: 'Not Available', label: 'Not Available' },
                  ]}
                  placeholder="Sewerage type"
                />
              </SwipeableField>
              <SwipeableField fieldName="stormDrainage" isHidden={hiddenFields.includes('stormDrainage')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Storm Drainage"
                  value={stormDrainage}
                  onChange={setStormDrainage}
                  options={[
                    { value: 'Underground (Municipal)', label: 'Underground (Municipal)' },
                    { value: 'Surface Drainage', label: 'Surface Drainage' },
                    { value: 'Open Nullah', label: 'Open Nullah' },
                    { value: 'Natural Slope', label: 'Natural Slope Drainage' },
                    { value: 'Not Available', label: 'Not Available' },
                  ]}
                  placeholder="Drainage type"
                />
              </SwipeableField>
              <SwipeableField fieldName="solidWasteManagement" isHidden={hiddenFields.includes('solidWasteManagement')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Solid Waste Management"
                  value={solidWasteManagement}
                  onChange={setSolidWasteManagement}
                  options={[
                    { value: 'Municipal Collection', label: 'Municipal Collection' },
                    { value: 'Private Agency', label: 'Private Agency' },
                    { value: 'Society/RWA Managed', label: 'Society/RWA Managed' },
                    { value: 'Self Disposal', label: 'Self Disposal' },
                    { value: 'Composting', label: 'Composting (In-house)' },
                    { value: 'Not Available', label: 'Not Available' },
                  ]}
                  placeholder="Waste management"
                />
              </SwipeableField>
              <SwipeableField fieldName="electricityStatus" isHidden={hiddenFields.includes('electricityStatus')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Electricity Status"
                  value={electricityStatus}
                  onChange={setElectricityStatus}
                  options={[
                    { value: 'Metered Connection Available', label: 'Metered Connection Available' },
                    { value: 'DISCOM Connected (BSES/Tata/MSEDCL)', label: 'DISCOM Connected (BSES/Tata/MSEDCL)' },
                    { value: '3-Phase Connection', label: '3-Phase Connection' },
                    { value: 'Single Phase Connection', label: 'Single Phase Connection' },
                    { value: 'DG Backup Available', label: 'DG Backup Available' },
                    { value: 'Solar + Grid', label: 'Solar + Grid Connected' },
                    { value: 'Temporary Connection', label: 'Temporary Connection' },
                    { value: 'Not Available', label: 'Not Available' },
                  ]}
                  placeholder="Electricity status"
                />
              </SwipeableField>
              <SwipeableField fieldName="publicTransportAccess" isHidden={hiddenFields.includes('publicTransportAccess')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Public Transport Access"
                  value={publicTransportAccess}
                  onChange={setPublicTransportAccess}
                  options={[
                    { value: 'Excellent (Metro + Bus within 500m)', label: 'Excellent (Metro + Bus within 500m)' },
                    { value: 'Good (Bus/Metro within 1km)', label: 'Good (Bus/Metro within 1km)' },
                    { value: 'Moderate (1-2km)', label: 'Moderate (1-2km)' },
                    { value: 'Poor (>2km)', label: 'Poor (>2km)' },
                    { value: 'Railway Station Nearby', label: 'Railway Station Nearby' },
                    { value: 'Auto/Rickshaw Only', label: 'Auto/Rickshaw Only' },
                  ]}
                  placeholder="Transport access"
                />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('environmentalSafety')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="rainWaterHarvesting" isHidden={hiddenFields.includes('rainWaterHarvesting')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Rain Water Harvesting"
                  value={rainWaterHarvesting}
                  onChange={setRainWaterHarvesting}
                  options={[
                    { value: 'Installed - Rooftop Collection', label: 'Installed - Rooftop Collection' },
                    { value: 'Installed - Recharge Pit', label: 'Installed - Recharge Pit' },
                    { value: 'Installed - Storage Tank', label: 'Installed - Storage Tank' },
                    { value: 'Installed - Complete System', label: 'Installed - Complete System' },
                    { value: 'Not Installed', label: 'Not Installed' },
                    { value: 'Mandatory (Plot >100sqm)', label: 'Mandatory (Plot >100sqm)' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="RWH status"
                />
              </SwipeableField>
              <SwipeableField fieldName="solarProvision" isHidden={hiddenFields.includes('solarProvision')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Solar Provision"
                  value={solarProvision}
                  onChange={setSolarProvision}
                  options={[
                    { value: 'Solar Water Heater Installed', label: 'Solar Water Heater Installed' },
                    { value: 'Solar PV Panels (On-grid)', label: 'Solar PV Panels (On-grid)' },
                    { value: 'Solar PV Panels (Off-grid)', label: 'Solar PV Panels (Off-grid)' },
                    { value: 'Solar Street Lights', label: 'Solar Street Lights' },
                    { value: 'Provision Available', label: 'Provision Available' },
                    { value: 'Not Installed', label: 'Not Installed' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="Solar status"
                />
              </SwipeableField>
              <SwipeableField fieldName="greenBuildingFeatures" isHidden={hiddenFields.includes('greenBuildingFeatures')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Green Building Features"
                  value={greenBuildingFeatures}
                  onChange={setGreenBuildingFeatures}
                  options={[
                    { value: 'None', label: 'None' },
                    { value: 'GRIHA Certified', label: 'GRIHA Certified' },
                    { value: 'IGBC Certified', label: 'IGBC Certified' },
                    { value: 'LEED Certified', label: 'LEED Certified' },
                    { value: 'Energy Efficient Design', label: 'Energy Efficient Design' },
                    { value: 'Partial Green Features', label: 'Partial Green Features' },
                  ]}
                  placeholder="Green certification"
                />
              </SwipeableField>
              <SwipeableField fieldName="environmentalPollution" isHidden={hiddenFields.includes('environmentalPollution')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Environmental Pollution"
                  value={environmentalPollution}
                  onChange={setEnvironmentalPollution}
                  options={[
                    { value: 'None/Negligible', label: 'None/Negligible' },
                    { value: 'Low (Residential Area)', label: 'Low (Residential Area)' },
                    { value: 'Moderate (Commercial Area)', label: 'Moderate (Commercial Area)' },
                    { value: 'High (Industrial Area Nearby)', label: 'High (Industrial Area Nearby)' },
                    { value: 'Noise Pollution', label: 'Noise Pollution' },
                    { value: 'Air Pollution', label: 'Air Pollution' },
                    { value: 'Water Pollution', label: 'Water Pollution' },
                  ]}
                  placeholder="Pollution level"
                />
              </SwipeableField>
              <SwipeableField fieldName="structuralSafety" isHidden={hiddenFields.includes('structuralSafety')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Structural Safety"
                  value={structuralSafety}
                  onChange={setStructuralSafety}
                  options={[
                    { value: 'Structurally Safe', label: 'Structurally Safe' },
                    { value: 'Good Condition', label: 'Good Condition' },
                    { value: 'Fair Condition', label: 'Fair Condition' },
                    { value: 'Needs Minor Repair', label: 'Needs Minor Repair' },
                    { value: 'Needs Major Repair', label: 'Needs Major Repair' },
                    { value: 'Dilapidated', label: 'Dilapidated' },
                    { value: 'Structurally Unsafe', label: 'Structurally Unsafe' },
                    { value: 'Under Construction', label: 'Under Construction' },
                  ]}
                  placeholder="Safety status"
                />
              </SwipeableField>
              <SwipeableField fieldName="earthquakeResistance" isHidden={hiddenFields.includes('earthquakeResistance')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Earthquake Zone/Resistance"
                  value={earthquakeResistance}
                  onChange={setEarthquakeResistance}
                  options={[
                    { value: 'Zone II (Low Risk)', label: 'Zone II (Low Risk)' },
                    { value: 'Zone III (Moderate Risk)', label: 'Zone III (Moderate Risk)' },
                    { value: 'Zone IV (High Risk)', label: 'Zone IV (High Risk)' },
                    { value: 'Zone V (Very High Risk)', label: 'Zone V (Very High Risk)' },
                    { value: 'Zone VI (Severe Risk)', label: 'Zone VI (Severe Risk - J&K/Himachal)' },
                    { value: 'Earthquake Resistant Design', label: 'Earthquake Resistant Design' },
                    { value: 'Not Compliant', label: 'Not Earthquake Compliant' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="Seismic zone"
                />
              </SwipeableField>
              <SwipeableField fieldName="visibleDamage" isHidden={hiddenFields.includes('visibleDamage')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Visible Damage"
                  value={visibleDamage}
                  onChange={setVisibleDamage}
                  options={[
                    { value: 'None', label: 'None' },
                    { value: 'Hairline Cracks', label: 'Hairline Cracks' },
                    { value: 'Minor Cracks', label: 'Minor Cracks' },
                    { value: 'Major Cracks', label: 'Major Cracks' },
                    { value: 'Seepage/Dampness', label: 'Seepage/Dampness' },
                    { value: 'Spalling of Concrete', label: 'Spalling of Concrete' },
                    { value: 'Corrosion of Reinforcement', label: 'Corrosion of Reinforcement' },
                    { value: 'Settlement Cracks', label: 'Settlement Cracks' },
                    { value: 'Multiple Issues', label: 'Multiple Issues' },
                  ]}
                  placeholder="Damage observed"
                />
              </SwipeableField>
              <SwipeableField fieldName="firefightingProvision" isHidden={hiddenFields.includes('firefightingProvision')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Firefighting Provision"
                  value={firefightingProvision}
                  onChange={setFirefightingProvision}
                  options={[
                    { value: 'Fire Extinguishers', label: 'Fire Extinguishers' },
                    { value: 'Fire Hydrants', label: 'Fire Hydrants' },
                    { value: 'Sprinkler System', label: 'Sprinkler System' },
                    { value: 'Fire Alarm System', label: 'Fire Alarm System' },
                    { value: 'Complete Fire Safety System', label: 'Complete Fire Safety System' },
                    { value: 'Smoke Detectors Only', label: 'Smoke Detectors Only' },
                    { value: 'Fire NOC Obtained', label: 'Fire NOC Obtained' },
                    { value: 'Not Provided', label: 'Not Provided' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="Fire safety"
                />
              </SwipeableField>
              <SwipeableField fieldName="maintenanceIssues" isHidden={hiddenFields.includes('maintenanceIssues')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Maintenance Issues"
                  value={maintenanceIssues}
                  onChange={setMaintenanceIssues}
                  options={[
                    { value: 'None', label: 'None' },
                    { value: 'Minor Repairs Required', label: 'Minor Repairs Required' },
                    { value: 'Paint/Whitewash Required', label: 'Paint/Whitewash Required' },
                    { value: 'Plumbing Issues', label: 'Plumbing Issues' },
                    { value: 'Electrical Issues', label: 'Electrical Issues' },
                    { value: 'Waterproofing Required', label: 'Waterproofing Required' },
                    { value: 'Seepage in Walls/Ceiling', label: 'Seepage in Walls/Ceiling' },
                    { value: 'Flooring Repair Required', label: 'Flooring Repair Required' },
                    { value: 'Multiple Issues', label: 'Multiple Issues' },
                  ]}
                  placeholder="Maintenance status"
                />
              </SwipeableField>
              <SwipeableField fieldName="extentOfDeterioration" isHidden={hiddenFields.includes('extentOfDeterioration')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Extent of Deterioration"
                  value={extentOfDeterioration}
                  onChange={setExtentOfDeterioration}
                  options={[
                    { value: 'Nil', label: 'Nil (0%)' },
                    { value: '0-5%', label: 'Negligible (0-5%)' },
                    { value: '5-10%', label: 'Minor (5-10%)' },
                    { value: '10-20%', label: 'Moderate (10-20%)' },
                    { value: '20-30%', label: 'Significant (20-30%)' },
                    { value: '30-50%', label: 'Major (30-50%)' },
                    { value: '>50%', label: 'Severe (>50%)' },
                  ]}
                  placeholder="Deterioration %"
                />
              </SwipeableField>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="glass-card-title">{t('economicRentalDetails')}</h3>
            <div className="grid-2">
              <SwipeableField fieldName="reasonableLettingValue" isHidden={hiddenFields.includes('reasonableLettingValue')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Reasonable Letting Value (Rs/month)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={reasonableLettingValue || ''} onChange={(e) => setReasonableLettingValue(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="isOccupiedByTenant" isHidden={hiddenFields.includes('isOccupiedByTenant')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Occupied by Tenant"
                  value={isOccupiedByTenant ? 'Yes' : 'No'}
                  onChange={(val) => setIsOccupiedByTenant(val === 'Yes')}
                  options={[
                    { value: 'No', label: 'No' },
                    { value: 'Yes', label: 'Yes' },
                  ]}
                  placeholder="Tenant status"
                />
              </SwipeableField>
              {isOccupiedByTenant && (
                <>
                  <SwipeableField fieldName="numberOfTenants" isHidden={hiddenFields.includes('numberOfTenants')} onHide={handleHideField} onRestore={handleRestoreField}>
                    <div className="form-group">
                      <label className="form-label">Number of Tenants</label>
                      <input type="number" inputMode="decimal" className="form-input" value={numberOfTenants || ''} onChange={(e) => setNumberOfTenants(Number(e.target.value))} placeholder="0" />
                    </div>
                  </SwipeableField>
                  <SwipeableField fieldName="tenancyDuration" isHidden={hiddenFields.includes('tenancyDuration')} onHide={handleHideField} onRestore={handleRestoreField}>
                    <FormSelectWithCustom
                      label="Tenancy Duration"
                      value={tenancyDuration}
                      onChange={setTenancyDuration}
                      options={[
                        { value: 'Less than 1 year', label: 'Less than 1 year' },
                        { value: '1-2 years', label: '1-2 years' },
                        { value: '2-5 years', label: '2-5 years' },
                        { value: '5-10 years', label: '5-10 years' },
                        { value: 'More than 10 years', label: 'More than 10 years' },
                        { value: 'Month to Month', label: 'Month to Month' },
                      ]}
                      placeholder="Duration"
                    />
                  </SwipeableField>
                  <SwipeableField fieldName="tenancyStatus" isHidden={hiddenFields.includes('tenancyStatus')} onHide={handleHideField} onRestore={handleRestoreField}>
                    <FormSelectWithCustom
                      label="Tenancy Status"
                      value={tenancyStatus}
                      onChange={setTenancyStatus}
                      options={[
                        { value: 'Registered', label: 'Registered' },
                        { value: 'Unregistered', label: 'Unregistered' },
                        { value: 'Rent Agreement Executed', label: 'Rent Agreement Executed' },
                        { value: 'Leave & License', label: 'Leave & License' },
                        { value: 'Old Tenancy (Rent Control)', label: 'Old Tenancy (Rent Control)' },
                        { value: 'Sub-let', label: 'Sub-let' },
                      ]}
                      placeholder="Tenancy type"
                    />
                  </SwipeableField>
                  <SwipeableField fieldName="monthlyRent" isHidden={hiddenFields.includes('monthlyRent')} onHide={handleHideField} onRestore={handleRestoreField}>
                    <div className="form-group">
                      <label className="form-label">Monthly Rent (Rs)</label>
                      <input type="number" inputMode="decimal" className="form-input" value={monthlyRent || ''} onChange={(e) => setMonthlyRent(Number(e.target.value))} placeholder="0" />
                    </div>
                  </SwipeableField>
                </>
              )}
              <SwipeableField fieldName="propertyTaxStatus" isHidden={hiddenFields.includes('propertyTaxStatus')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Property Tax Status"
                  value={propertyTaxStatus}
                  onChange={setPropertyTaxStatus}
                  options={[
                    { value: 'Paid (Current)', label: 'Paid (Current)' },
                    { value: 'Paid till Last FY', label: 'Paid till Last FY' },
                    { value: 'Arrears Pending', label: 'Arrears Pending' },
                    { value: 'Under Assessment', label: 'Under Assessment' },
                    { value: 'Exempted', label: 'Exempted' },
                    { value: 'Not Applicable', label: 'Not Applicable' },
                  ]}
                  placeholder="Tax status"
                />
              </SwipeableField>
              <SwipeableField fieldName="propertyInsurance" isHidden={hiddenFields.includes('propertyInsurance')} onHide={handleHideField} onRestore={handleRestoreField}>
                <FormSelectWithCustom
                  label="Property Insurance"
                  value={propertyInsurance}
                  onChange={setPropertyInsurance}
                  options={[
                    { value: 'Insured (Fire + Allied Perils)', label: 'Insured (Fire + Allied Perils)' },
                    { value: 'Insured (Comprehensive)', label: 'Insured (Comprehensive)' },
                    { value: 'Insured (Fire Only)', label: 'Insured (Fire Only)' },
                    { value: 'Insured (Earthquake)', label: 'Insured (Earthquake)' },
                    { value: 'Society Insurance', label: 'Society Insurance' },
                    { value: 'Not Insured', label: 'Not Insured' },
                    { value: 'Not Known', label: 'Not Known' },
                  ]}
                  placeholder="Insurance status"
                />
              </SwipeableField>
              <SwipeableField fieldName="maintenanceCharges" isHidden={hiddenFields.includes('maintenanceCharges')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Monthly Maintenance (Rs)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={maintenanceCharges || ''} onChange={(e) => setMaintenanceCharges(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
              <SwipeableField fieldName="securityCharges" isHidden={hiddenFields.includes('securityCharges')} onHide={handleHideField} onRestore={handleRestoreField}>
                <div className="form-group">
                  <label className="form-label">Security Charges (Rs/month)</label>
                  <input type="number" inputMode="decimal" className="form-input" value={securityCharges || ''} onChange={(e) => setSecurityCharges(Number(e.target.value))} placeholder="0" />
                </div>
              </SwipeableField>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Photos */}
      {activeSection === 5 && (
        <div className="space-y-4 lg:space-y-6 animate-fade-in">
          <div className="glass-card">
            <h3 className="glass-card-title">{t('propertyPhotos')}</h3>

            {/* Upload options - using labels for better mobile compatibility */}
            <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-4 lg:mb-6">
              {/* Camera Button - Using label for reliable mobile camera access */}
              <label className="flex flex-col items-center justify-center gap-1.5 lg:gap-2 p-3 lg:p-5 bg-gradient-to-br from-brand/20 to-brand/5 border-2 border-brand/40 rounded-xl lg:rounded-2xl hover:border-brand hover:from-brand/30 hover:to-brand/10 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <input
                  ref={cameraInputRef}
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

              {/* Gallery Button */}
              <label className="flex flex-col items-center justify-center gap-1.5 lg:gap-2 p-3 lg:p-5 border-2 border-surface-300 rounded-xl lg:rounded-2xl hover:border-text-tertiary hover:bg-surface-200/30 active:scale-[0.98] transition-all duration-200 cursor-pointer">
                <input
                  ref={galleryInputRef}
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
                  <p className="text-[10px] lg:text-xs text-text-tertiary sm:hidden">Tap to select</p>
                  <p className="text-[10px] lg:text-xs text-text-tertiary hidden sm:block">Drag or browse</p>
                </div>
              </div>
            </div>

            {/* Upload progress indicator — shows exact step */}
            {uploadingPhotos > 0 && (
              <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-brand/10 border border-brand/20">
                <svg className="animate-spin w-4 h-4 text-brand flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs text-brand font-medium">
                  {uploadStage || 'Processing...'} ({uploadingPhotos} photo{uploadingPhotos !== 1 ? 's' : ''})
                </span>
              </div>
            )}

            {/* Error message with dismiss */}
            {photoError && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-amber-400 font-medium flex-1">{photoError}</p>
                  <button
                    onClick={() => setPhotoError(null)}
                    className="p-1 text-amber-400 hover:text-amber-300 transition-colors flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Failed photo uploads with retry */}
            {failedPhotos.length > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-400 font-medium">
                    {failedPhotos.length} photo{failedPhotos.length !== 1 ? 's' : ''} failed
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFailedPhotos([])}
                      className="px-3 py-1 text-xs font-medium text-red-400 rounded-lg transition-colors hover:bg-red-500/10"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={async () => {
                        const toRetry = [...failedPhotos];
                        setFailedPhotos([]);
                        for (const f of toRetry) {
                          await processAndAddPhoto(f);
                        }
                      }}
                      className="px-3 py-1 text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Retry All
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 pb-1.5 lg:px-2 lg:pb-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <span className="text-[10px] lg:text-xs text-white font-medium">Photo {actualIndex + 1}</span>
                          <div className="flex gap-0.5">
                            {actualIndex > 0 && (
                              <button type="button" onClick={() => movePhoto(actualIndex, -1)} className="p-1 rounded bg-black/50 text-white hover:bg-white/30 transition-colors" title="Move left">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                              </button>
                            )}
                            {actualIndex < photos.length - 1 && (
                              <button type="button" onClick={() => movePhoto(actualIndex, 1)} className="p-1 rounded bg-black/50 text-white hover:bg-white/30 transition-colors" title="Move right">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                              </button>
                            )}
                          </div>
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
                  Photos compressed and uploaded to cloud. 6 per page in report.
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
            <h3 className="glass-card-title">{t('propertyLocation')}</h3>
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

      {/* (SwipeHint removed — toggle icons used instead) */}

      {/* Floating Action Button for Hidden Fields */}
      {hiddenFields.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHiddenFieldsModal(true)}
          className="hidden-fields-fab"
          title={`${hiddenFields.length} hidden field${hiddenFields.length !== 1 ? 's' : ''}`}
        >
          <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
          <span className="badge">{hiddenFields.length}</span>
        </button>
      )}

      {/* Hide field toast with Undo */}
      {hideToast?.visible && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-200 border border-surface-300 shadow-xl text-sm">
            <span className="text-text-secondary">Field hidden</span>
            <button
              type="button"
              onClick={() => {
                handleRestoreField(hideToast.fieldName);
                setHideToast(null);
                if (hideToastTimeoutRef.current) clearTimeout(hideToastTimeoutRef.current);
              }}
              className="font-semibold text-brand hover:text-brand-light transition-colors"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Hidden Fields Modal */}
      {showHiddenFieldsModal && (
        <HiddenFieldsModal
          hiddenFields={hiddenFields}
          onRestore={handleRestoreField}
          onRestoreAll={handleRestoreAllFields}
          onClose={() => setShowHiddenFieldsModal(false)}
        />
      )}
    </>
  );
}
