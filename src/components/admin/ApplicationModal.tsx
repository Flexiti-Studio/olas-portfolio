import { useState, useEffect } from "react";
import { X, Building, Target, Link as LinkIcon, FileText, Calendar, Edit3, Save, ExternalLink, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Application, Stage, STAGES } from "./ApplicationTracker";

interface ApplicationModalProps {
  appId: string;
  onClose: () => void;
  onUpdate: (updated: Application) => void;
  cvs?: any[];
  coverLetters?: any[];
}

export default function ApplicationModal({ appId, onClose, onUpdate, cvs = [], coverLetters = [] }: ApplicationModalProps) {
  const [app, setApp] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Application>>({});

  useEffect(() => {
    fetchAppDetails();
  }, [appId]);

  const fetchAppDetails = async () => {
    try {
      const res = await fetch(`/api/applications/${appId}`);
      if (res.ok) {
        const data = await res.json();
        setApp(data);
        setEditForm(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Find slug if cv id is changed
      let slug = editForm.linked_cv_slug;
      if (editForm.linked_cv_id) {
        const cv = cvs.find(c => c.id === editForm.linked_cv_id);
        if (cv) slug = cv.slug;
      }

      const payload = { ...editForm, linked_cv_slug: slug };

      const res = await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updated = await res.json();
        setApp(updated);
        onUpdate(updated);
        setIsEditing(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-zinc-950 border-l border-zinc-800 shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <p className="text-zinc-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
              Loading details...
            </p>
          </div>
        ) : !app ? (
          <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
            <p className="text-red-400">Application not found or could not be loaded.</p>
            <button onClick={onClose} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg">Close</button>
          </div>
        ) : (
          <>
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/50">
          <div className="pr-8 flex-1">
            {isEditing ? (
              <input 
                type="text"
                value={editForm.job_title || ''}
                onChange={e => setEditForm({...editForm, job_title: e.target.value})}
                className="text-2xl font-bold bg-zinc-950 border border-zinc-800 rounded px-2 py-1 w-full text-white mb-2"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white mb-1">{app.job_title}</h2>
            )}
            
            <div className="flex items-center gap-2 text-zinc-400">
              <Building size={16} />
              {isEditing ? (
                <input 
                  type="text"
                  value={editForm.company || ''}
                  onChange={e => setEditForm({...editForm, company: e.target.value})}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-sm w-full text-white"
                />
              ) : (
                <span className="font-medium text-zinc-300">{app.company}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <button onClick={handleSave} className="p-2 bg-white text-black rounded-lg hover:bg-zinc-200">
                <Save size={18} />
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)} className="p-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700">
                <Edit3 size={18} />
              </button>
            )}
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar">
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
              <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1 block">Stage</label>
              {isEditing ? (
                <select 
                  value={editForm.stage || 'Wishlist'}
                  onChange={e => setEditForm({...editForm, stage: e.target.value as Stage})}
                  className="bg-zinc-950 border border-zinc-700 rounded p-1 text-sm text-white w-full"
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300">
                  {app.stage}
                </span>
              )}
            </div>
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
              <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1 block">Date</label>
              {isEditing ? (
                <input 
                  type="date"
                  value={editForm.created_at ? new Date(editForm.created_at).toISOString().split('T')[0] : ''}
                  onChange={e => setEditForm({...editForm, created_at: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                  className="bg-zinc-950 border border-zinc-700 rounded p-1 text-sm text-white w-full style-color-scheme-dark"
                />
              ) : (
                <span className="text-sm text-zinc-300 flex items-center gap-1">
                  <Calendar size={14} />
                  {app.created_at ? format(new Date(app.created_at), 'MMM d, yyyy') : 'No Date'}
                </span>
              )}
            </div>
          </div>

          {/* CV Tailor Integration */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={16} />
              Tailored CV
            </h3>
            {isEditing ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <select 
                  value={editForm.linked_cv_id || ''} 
                  onChange={e => setEditForm({...editForm, linked_cv_id: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-zinc-300"
                >
                  <option value="">-- No CV attached --</option>
                  {cvs.map(cv => (
                    <option key={cv.id} value={cv.id}>{cv.jobTitle} at {cv.company}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5">
                {app.linked_cv_id ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            {cvs.find(c => c.id === app.linked_cv_id)?.jobTitle || 'Tailored CV Attached'}
                          </p>
                          <p className="text-xs text-zinc-500">Linked to this application</p>
                        </div>
                      </div>
                      {app.linked_cv_slug && (
                        <a 
                          href={`/admin?tab=cv-tailor&cv=${app.linked_cv_slug}`}
                          target="_blank"
                          className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                        >
                          Open in Editor <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {/* Optional Quick Preview snippet if the CV has a description/instructions stored */}
                    {cvs.find(c => c.id === app.linked_cv_id)?.instructions && (
                      <div className="mt-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        <strong>CV Focus/Instructions:</strong> {cvs.find(c => c.id === app.linked_cv_id)?.instructions}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 italic">No tailored CV is linked to this application.</p>
                )}
              </div>
            )}
          </div>

          {/* Job Description */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building size={16} />
              Job Description
            </h3>
            {isEditing ? (
              <textarea
                value={editForm.job_description || ''}
                onChange={e => setEditForm({...editForm, job_description: e.target.value})}
                rows={8}
                placeholder="Paste the job description here..."
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:border-zinc-500 outline-none resize-y"
              />
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5">
                {app.job_description ? (
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">
                    {app.job_description}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-600 italic">No job description added yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Cover Letter Section */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target size={16} />
              Cover Letter
            </h3>
            {isEditing ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <select 
                  value={editForm.cover_letter_url || ''}
                  onChange={e => setEditForm({...editForm, cover_letter_url: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-zinc-300"
                >
                  <option value="">-- No Cover Letter attached --</option>
                  {coverLetters.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.jobTitle} at {cl.company}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5">
                {app.cover_letter_url ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-900/20 text-blue-400 rounded-lg">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            {coverLetters.find(c => c.id === app.cover_letter_url)?.jobTitle || 'Cover Letter Attached'}
                          </p>
                          <p className="text-xs text-zinc-500">Linked to this application</p>
                        </div>
                      </div>
                      {coverLetters.find(c => c.id === app.cover_letter_url)?.slug && (
                        <a 
                          href={`/admin?tab=cover-letters&cl=${coverLetters.find(c => c.id === app.cover_letter_url)?.slug}`}
                          target="_blank"
                          className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
                        >
                          Open <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    {/* Quick Preview of Cover Letter Content if available */}
                    {(() => {
                      const cl = coverLetters.find(c => c.id === app.cover_letter_url);
                      if (!cl || !cl.versions || cl.versions.length === 0) return null;
                      const ver = cl.versions[cl.currentVersion || 0];
                      const content = typeof ver === 'string' ? ver : (ver?.text || ver?.content || JSON.stringify(ver));
                      return (
                        <div className="mt-2 p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto font-serif leading-relaxed">
                          {content}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-600 italic">No cover letter attached from DB.</p>
                )}
              </div>
            )}
          </div>

          {/* Interview Prep Section */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GraduationCap size={16} />
              AI Interview Prep
            </h3>
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5">
              {(app as any).courses?.length > 0 ? (
                <div className="space-y-3">
                  {(app as any).courses.map((course: any) => (
                    <div key={course.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
                      <div>
                        <div className="font-medium text-sm text-white">{course.title}</div>
                        <div className="text-xs text-zinc-500 mt-1">Progress: {course.progress?.overall_percentage || 0}% • Flashcards: {course.progress?.flashcard_mastery || 0}%</div>
                      </div>
                      <a href={`/admin/interview-prep/${course.id}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-white bg-indigo-950/30 hover:bg-indigo-900/50 text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                        Open Course <ExternalLink size={10} />
                      </a>
                    </div>
                  ))}
                  <div className="pt-2">
                    <a href="/admin/interview-prep/new" target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1">
                      + Create new prep course
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-zinc-500 mb-3">No prep courses linked to this application yet.</p>
                  <a href="/admin/interview-prep/new" target="_blank" rel="noreferrer" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors inline-block">
                    Create Prep Course
                  </a>
                </div>
              )}
            </div>
          </div>
          
        </div>
        </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
