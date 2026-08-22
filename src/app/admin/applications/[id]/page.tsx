"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ApplicationModal from "@/components/admin/ApplicationModal";
import { ArrowLeft } from "lucide-react";

export default function ApplicationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [cvs, setCvs] = useState<any[]>([]);

  useEffect(() => {
    // Fetch CVs so the modal can link CVs if edited
    fetch("/api/cv")
      .then(res => res.ok ? res.json() : [])
      .then(data => setCvs(data))
      .catch(console.error);
  }, []);

  if (!id) return null;

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 pt-8 pb-4 flex items-center">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back to Applications Tracker
        </button>
      </div>
      
      <ApplicationModal 
        appId={id}
        onClose={() => router.back()}
        onUpdate={() => {}} // State is managed inside ApplicationModal
        cvs={cvs}
        isPageMode={true}
      />
    </div>
  );
}
