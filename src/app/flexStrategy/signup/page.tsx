"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Account created! Welcome to flexStrategy.');
      router.push('/flexStrategy/dashboard');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-sm bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <Link href="/flexStrategy" className="inline-flex items-center gap-2 font-bold text-lg text-white">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-lg">bolt</span>
            </span>
            <span>flexStrategy</span>
          </Link>
          <p className="text-xs text-zinc-400">Create your trading strategy account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trader@flexiti.studio"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create strong password"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-900/30 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-800/80">
          <Link href="/flexStrategy/login" className="text-xs text-zinc-400 hover:text-white">
            Already have an account? <span className="text-blue-400 font-semibold">Sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
