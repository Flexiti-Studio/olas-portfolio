"use client";

import { useTransition } from 'react';
import { addToWatchlist } from '@/app/actions/watchlist';

export function WatchlistAddButton({ ticker, isWatched }: { ticker: string, isWatched: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (isWatched) {
    return (
      <button disabled className="text-gray-500 bg-gray-800 px-3 py-1.5 rounded text-xs font-medium cursor-not-allowed">
        ✓ Watching
      </button>
    );
  }

  return (
    <button
      disabled={isPending}
      onClick={(e) => {
        e.stopPropagation();
        startTransition(async () => {
          const res = await addToWatchlist(ticker);
          if (!res.success) {
            alert(res.error);
          }
        });
      }}
      className="text-blue-400 bg-blue-900/30 hover:bg-blue-900/50 hover:text-blue-300 border border-blue-900 px-3 py-1.5 rounded transition-colors text-xs font-medium disabled:opacity-50"
    >
      {isPending ? 'Adding...' : '+ Watch'}
    </button>
  );
}
