"use client";

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DateFilter({ currentDate }: { currentDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (newDate) {
      params.set('date', newDate);
    } else {
      params.delete('date');
    }
    
    router.push(`/trading?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
      <label htmlFor="date-picker" className="text-gray-400 font-medium text-sm">
        Date:
      </label>
      <input 
        type="date" 
        id="date-picker"
        value={currentDate}
        onChange={handleDateChange}
        className="bg-transparent text-white border-none focus:outline-none cursor-pointer [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
        max={new Date().toISOString().split('T')[0]}
      />
    </div>
  );
}
