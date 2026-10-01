import React from 'react';
import { prisma } from '@/lib/prisma';
import { StrategyPlaybook } from './StrategyPlaybook';

export default async function StrategyPage() {
  const strategies = await prisma.tradingStrategy.findMany({
    orderBy: { updatedAt: 'desc' }
  });

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="w-[98%] mx-auto mb-8 flex justify-between items-end border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Strategy Playbook</h1>
          <p className="text-gray-400">Your active strategies and trading setups across the market.</p>
        </div>
      </div>
      
      <div className="w-[98%] mx-auto">
        <StrategyPlaybook strategies={strategies} />
      </div>
    </div>
  );
}
