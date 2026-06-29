'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  format?: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  placeholder?: string;
  required?: boolean;
}

export default function DatePicker({
  value,
  onChange,
  format = 'DD/MM/YYYY',
  placeholder = 'Select Date',
  required = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const defaultClassNames = getDefaultClassNames();

  // Parse string value into Date
  const getSelectedDate = (): Date | undefined => {
    if (!value) return undefined;
    if (format === 'DD/MM/YYYY') {
      const parts = value.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    } else {
      const parts = value.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    }
    return undefined;
  };

  const selectedDate = getSelectedDate();

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    
    let formattedVal = '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    if (format === 'DD/MM/YYYY') {
      formattedVal = `${day}/${month}/${year}`;
    } else {
      formattedVal = `${year}-${month}-${day}`;
    }

    onChange(formattedVal);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          readOnly
          required={required}
          value={value}
          placeholder={placeholder}
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-lg text-[#0F172A] text-sm focus:outline-none focus:border-blue-600 transition text-left cursor-pointer pr-10"
        />
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer text-[#94A3B8] hover:text-[#475569]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[100] mt-1.5 p-3 bg-white border border-[#E2E8F0] rounded-xl shadow-xl flex flex-col items-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            className="m-0"
            captionLayout="dropdown"
            startMonth={new Date(new Date().getFullYear() - 10, 0)}
            endMonth={new Date(new Date().getFullYear() + 10, 11)}
            classNames={{
              ...defaultClassNames,
              selected: `${defaultClassNames.selected || ''} bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:bg-blue-700`,
              today: `${defaultClassNames.today || ''} border border-blue-200 text-blue-600 font-bold`,
            }}
          />
        </div>
      )}
    </div>
  );
}
