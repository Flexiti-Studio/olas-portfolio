"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth =
        localStorage.getItem("admin_authenticated") === "true" ||
        sessionStorage.getItem("admin_authenticated") === "true";
      setIsAuthenticated(auth);
    }
  }, []);

  return { isAuthenticated, isLoading: isAuthenticated === null };
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "1122" || passcode === "admin123") {
      localStorage.setItem("admin_authenticated", "true");
      window.location.reload();
    } else {
      setError("Invalid passcode");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white text-center mb-2">Admin Access Required</h1>
          <p className="text-sm text-slate-400 text-center mb-6">
            Enter your passcode to manage the Learning Lab.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError("");
              }}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              autoFocus
            />
            {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/20"
            >
              Unlock Lab
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

