import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="animate-pulse">
        <div className="mb-8 flex justify-between items-center">
        <div>
          <div className="h-8 bg-gray-800 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-900 rounded w-48"></div>
        </div>
        <div className="h-10 bg-gray-800 rounded w-32"></div>
      </div>

      {/* Filters Skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 mb-8 flex flex-wrap items-end gap-4">
        <div className="w-32 h-10 bg-gray-800 rounded"></div>
        <div className="w-32 h-10 bg-gray-800 rounded"></div>
        <div className="w-32 h-10 bg-gray-800 rounded"></div>
        <div className="w-24 h-10 bg-gray-800 rounded"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-10">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-lg">
            <div className="h-4 bg-gray-800 rounded w-20 mb-2"></div>
            <div className="h-8 bg-gray-800 rounded w-16"></div>
          </div>
        ))}
      </div>

      {/* Table Skeletons */}
      {[1, 2].map((tableIndex) => (
        <div key={tableIndex} className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-6 bg-gray-800 rounded w-32"></div>
            <div className="h-5 bg-gray-800 rounded w-12 rounded-full"></div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="px-4 py-4 w-10"><div className="h-4 bg-gray-800 rounded w-4"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-20"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-16"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-12"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-16"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-24"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-32"></div></th>
                  <th className="px-6 py-4"><div className="h-4 bg-gray-800 rounded w-16"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row}>
                    <td className="px-4 py-4"><div className="h-4 bg-gray-900 rounded w-4"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-900 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-900 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-900 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-900 rounded w-16"></div></td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-900 rounded w-24 mb-1"></div>
                      <div className="h-3 bg-gray-900 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-gray-900 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-900 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-900 rounded w-16"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
