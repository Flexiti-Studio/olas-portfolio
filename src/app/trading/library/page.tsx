import React from 'react';
import { LibraryClient } from './LibraryClient';

export const metadata = {
  title: 'Strategy Library | Trading Bot Playbook',
  description: 'The 12 trading strategies worth testing in your bot, categorized with execution rules, weaknesses, and setup charts.',
};

export default function LibraryPage() {
  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] mx-auto">
        <LibraryClient />
      </div>
    </div>
  );
}
