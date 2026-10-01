"use client";

import { useTransition } from 'react';
import { removeFromWatchlist } from '@/app/actions/watchlist';

export function WatchlistRemoveButton({ ticker }: { ticker: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await removeFromWatchlist(ticker);
          if (!res.success) {
            alert(res.error);
          }
        });
      }}
      className="text-red-500 hover:text-red-400 hover:bg-red-900/20 px-3 py-1.5 rounded transition-colors text-xs font-medium disabled:opacity-50"
    >
      {isPending ? 'Removing...' : 'Remove'}
    </button>
  );
}
