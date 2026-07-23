import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Plus, MoreVertical, Building, Clock, Target, Calendar as CalendarIcon, ChevronLeft, ChevronRight, LayoutGrid, Search, Filter, X, GraduationCap } from "lucide-react";
import { formatDistanceToNow, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import ApplicationModal from "./ApplicationModal";
import { motion, AnimatePresence } from "framer-motion";

// Types
export type Stage = 'Wishlist' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Archived';
export const STAGES: Stage[] = ['Wishlist', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived'];

export interface Application {
  id: string;
  job_title: string;
  company: string;
  location?: string;
  stage: Stage;
  tags: string[];
  job_description?: string;
  date_applied?: string;
  follow_up_date?: string;
  created_at: string;
  cover_letter_url?: string;
  linked_cv_id?: string;
  linked_cv_slug?: string;
  job_type?: string;
}

export const getAppJobType = (app: Application): 'remote' | 'hybrid' | 'in-person' | 'onsite' | null => {
  if (app.job_type) {
    const val = app.job_type.toLowerCase();
    if (['remote', 'hybrid', 'in-person', 'onsite'].includes(val)) return val as any;
  }
  if (app.tags && Array.isArray(app.tags)) {
    const found = app.tags.find(t => ['remote', 'hybrid', 'in-person', 'onsite'].includes(String(t).toLowerCase()));
    if (found) return found.toLowerCase() as any;
  }
  return null;
};

export default function ApplicationTracker() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newApp, setNewApp] = useState({ jobTitle: '', company: '', source: 'LinkedIn', job_description: '', cover_letter_url: '', linked_cv_id: '', linked_cv_slug: '', created_at: new Date().toISOString() });
  const [isCreating, setIsCreating] = useState(false);

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayModalPage, setDayModalPage] = useState(1);
  const DAY_PAGE_SIZE = 5;

  const [view, setView] = useState<'calendar' | 'kanban'>('kanban');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | ''>('');
  const [tagFilter, setTagFilter] = useState<string | ''>('');

  useEffect(() => {
    fetchApplications();
    fetchCVs();
    fetchCoverLetters();
  }, []);

  const fetchCoverLetters = async () => {
    try {
      const res = await fetch("/api/cover-letters");
      if (res.ok) {
        const data = await res.json();
        setCoverLetters(data);
      }
    } catch (err) {
      console.error("Failed to fetch cover letters:", err);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCVs = async () => {
    try {
      const res = await fetch("/api/cv");
      if (res.ok) {
        const data = await res.json();
        setCvs(data);
      }
    } catch (err) {
      console.error("Failed to fetch CVs:", err);
    }
  };

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      if (tagFilter && !(app.tags || []).includes(tagFilter)) return false;
      if (stageFilter && app.stage !== stageFilter) return false;
      if (searchQuery) {
        const term = searchQuery.toLowerCase();
        const tagsText = (app.tags || []).join(' ').toLowerCase();
        return app.company.toLowerCase().includes(term)
          || app.job_title.toLowerCase().includes(term)
          || (app.job_description || '').toLowerCase().includes(term)
          || tagsText.includes(term);
      }
      return true;
    });
  }, [applications, searchQuery, stageFilter, tagFilter]);

  const uniqueTags = useMemo(() => {
    const s = new Set<string>();
    applications.forEach(a => (a.tags || []).forEach((t: string) => { if (t && String(t).trim()) s.add(t); }));
    return Array.from(s).sort();
  }, [applications]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceStage = result.source.droppableId as Stage;
    const destStage = result.destination.droppableId as Stage;
    const appId = result.draggableId;

    if (sourceStage === destStage) return;

    // Optimistic UI update
    setApplications(apps => apps.map(app =>
      app.id === appId ? { ...app, stage: destStage } : app
    ));

    try {
      await fetch(`/api/applications/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: destStage })
      });
    } catch (error) {
      console.error("Failed to update stage:", error);
      fetchApplications();
    }
  };

  const handleCreate = async () => {
    if (!newApp.jobTitle || !newApp.company) return;
    setIsCreating(true);

    let slug = '';
    if (newApp.linked_cv_id) {
      const cv = cvs.find(c => c.id === newApp.linked_cv_id);
      if (cv) slug = cv.slug;
    }

    const payload = {
      ...newApp,
      linked_cv_slug: slug
    };

    try {
      const res = await fetch("/api/applications", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        setApplications([created, ...applications]);
        setIsAddModalOpen(false);
        setNewApp({ jobTitle: '', company: '', source: 'LinkedIn', job_description: '', cover_letter_url: '', linked_cv_id: '', linked_cv_slug: '', created_at: new Date().toISOString() });
      } else {
        const errData = await res.json();
        alert(`Failed to create: ${errData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Network error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getAppsByStage = (stage: Stage) => filteredApps.filter(a => a.stage === stage);

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const openAddModal = (e?: React.MouseEvent, date?: Date) => {
    if (e) e.stopPropagation();
    setNewApp(prev => ({
      ...prev,
      created_at: date ? date.toISOString() : new Date().toISOString()
    }));
    setIsAddModalOpen(true);
  };

  const openAppPreview = (appId: string) => {
    setSelectedAppId(appId);
    setSelectedDay(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white rounded-2xl border border-zinc-800 p-6 overflow-hidden relative">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Application Tracker</h2>
          <p className="text-zinc-400 text-sm mt-1">Track your job applications and pipeline.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search companies, jobs..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-zinc-500 outline-none"
            />
          </div>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value as Stage | '')}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-zinc-500 outline-none text-zinc-300"
          >
            <option value="">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={tagFilter}
            onChange={e => setTagFilter(e.target.value as string | '')}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-zinc-500 outline-none text-zinc-300"
            title="Filter by tag"
          >
            <option value="">All Tags</option>
            {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setView('calendar')}
              className={`p-1.5 rounded-md transition-colors ${view === 'calendar' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Calendar View"
            >
              <CalendarIcon size={16} />
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
              title="Kanban View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500">Loading pipeline...</p>
        </div>
      ) : view === 'calendar' ? (
        /* Calendar View */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">{format(currentDate, "MMMM yyyy")}</h3>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-2 border border-zinc-800 rounded-lg hover:bg-zinc-800"><ChevronLeft size={16} /></button>
              <button onClick={nextMonth} className="p-2 border border-zinc-800 rounded-lg hover:bg-zinc-800"><ChevronRight size={16} /></button>
              <button onClick={(e) => openAddModal(e)} className="p-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 flex items-center gap-2 px-4 ml-4">
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-800 rounded-xl overflow-y-auto flex-1 hide-scrollbar">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-zinc-900/80 p-3 text-center text-xs font-semibold text-zinc-400 sticky top-0 z-10">{d}</div>
            ))}

            {days.map((day, i) => {
              const dayApps = filteredApps.filter(app => {
                const appDate = app.created_at ? new Date(app.created_at) : new Date();
                return isSameDay(appDate, day);
              });

              const stats = STAGES.reduce((acc, stage) => {
                acc[stage] = dayApps.filter(a => a.stage === stage).length;
                return acc;
              }, {} as Record<string, number>);

              const isCurrentMonth = isSameMonth(day, monthStart);

              return (
                <div
                  key={i}
                  onClick={() => dayApps.length > 0 && setSelectedDay(day)}
                  className={`min-h-[140px] bg-zinc-950 p-3 flex flex-col transition-all ${isCurrentMonth ? '' : 'opacity-50 bg-zinc-900/50'} ${dayApps.length > 0 ? 'hover:bg-zinc-900 cursor-pointer hover:border-zinc-700' : ''} group relative border border-transparent`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-white text-black' : 'text-zinc-400'}`}>
                      {format(day, 'd')}
                    </span>
                    <button
                      onClick={(e) => openAddModal(e, day)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-all"
                      title="Add Application"
                    >
                      <Plus size={14} />
                    </button>
                    {dayApps.some((a: any) => a.courses?.length > 0) && (
                      <div className="flex items-center gap-1 bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded text-[10px] font-medium" title="Interview prep ready">
                        <GraduationCap size={10} /> {dayApps.reduce((sum, a: any) => sum + (a.courses?.length || 0), 0)}
                      </div>
                    )}
                  </div>

                  {dayApps.length > 0 && (
                    <div className="flex flex-col gap-1.5 flex-1 pointer-events-none">
                      {/* Stats Badges */}
                      {stats['Wishlist'] > 0 && <div className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-300 border border-blue-800/50 font-medium">{stats['Wishlist']} Wishlist</div>}
                      {stats['Applied'] > 0 && <div className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-300 border border-green-800/50 font-medium">{stats['Applied']} Applied</div>}
                      {stats['Interview'] > 0 && <div className="text-xs px-2 py-1 rounded bg-purple-900/50 text-purple-300 border border-purple-800/50 font-medium">{stats['Interview']} Interview</div>}
                      {stats['Offer'] > 0 && <div className="text-xs px-2 py-1 rounded bg-yellow-900/50 text-yellow-300 border border-yellow-800/50 font-medium">{stats['Offer']} Offer</div>}
                      {stats['Rejected'] > 0 && <div className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-300 border border-red-800/50 font-medium">{stats['Rejected']} Rejected</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex-1 overflow-x-auto hide-scrollbar">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full pb-4 items-start">
              {STAGES.map(stage => {
                const columnApps = getAppsByStage(stage);
                return (
                  <div key={stage} className="flex-shrink-0 w-80 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col max-h-full">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 rounded-t-xl sticky top-0 z-10">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-zinc-200">{stage}</h3>
                        <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full font-medium">
                          {columnApps.length}
                        </span>
                      </div>
                      {stage === 'Wishlist' && (
                        <button
                          onClick={(e) => openAddModal(e)}
                          className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>

                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-800/30' : ''}`}
                        >
                          {columnApps.map((app, index) => (
                            <Draggable key={app.id} draggableId={app.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-zinc-950 border border-zinc-800 p-4 rounded-xl cursor-grab active:cursor-grabbing hover:border-zinc-700 transition-colors ${snapshot.isDragging ? 'shadow-2xl border-zinc-600 scale-105 z-50' : ''}`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h4
                                      className="font-semibold text-sm leading-tight text-white cursor-pointer hover:text-blue-400 transition-colors"
                                      onClick={() => setSelectedAppId(app.id)}
                                    >
                                      {app.job_title}
                                    </h4>
                                    <button
                                      className="text-zinc-600 hover:text-white"
                                      onClick={() => setSelectedAppId(app.id)}
                                    >
                                      <MoreVertical size={14} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                                    <Building size={12} />
                                    <span className="truncate">{app.company}</span>
                                  </div>
                                   {(() => {
                                     const jt = getAppJobType(app);
                                     if (!jt) return null;
                                     return (
                                       <div className="mb-2.5">
                                         <span className={`text-[11px] font-semibold inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${
                                           jt === 'remote'
                                             ? 'bg-blue-950/50 border-blue-800/60 text-blue-300'
                                             : jt === 'hybrid'
                                             ? 'bg-purple-950/50 border-purple-800/60 text-purple-300'
                                             : 'bg-amber-950/50 border-amber-800/60 text-amber-300'
                                         }`}>
                                           {jt === 'remote' ? '🌐 Remote' : jt === 'hybrid' ? '⚡ Hybrid' : '🏢 Onsite'}
                                         </span>
                                       </div>
                                     );
                                   })()}

                                  {app.tags && app.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                      {app.tags.map(tag => (
                                        <button
                                          key={tag}
                                          onClick={() => setTagFilter(tagFilter === tag ? '' : tag)}
                                          className={`text-[10px] px-1.5 py-0.5 rounded border ${tagFilter === tag ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                                          title={`Filter by ${tag}`}
                                        >
                                          {tag}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-xs text-zinc-500">
                                    <div className="flex items-center gap-1">
                                      <Clock size={12} />
                                      <span>
                                        {app.created_at ? formatDistanceToNow(new Date(app.created_at), { addSuffix: true }) : 'Just now'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {columnApps.length === 0 && (
                            <div className="h-full flex items-center justify-center p-4">
                              <p className="text-zinc-600 text-xs italic text-center">Drag cards here</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* Day Modal (Shows Apps for a specific day) */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setSelectedDay(null); setDayModalPage(1); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Applications</h3>
                  <p className="text-zinc-400 text-sm mt-1">{format(selectedDay, 'EEEE, MMMM do yyyy')}</p>
                </div>
                <button onClick={() => { setSelectedDay(null); setDayModalPage(1); }} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-3">
                {(() => {
                  const dayApps = filteredApps.filter(app => {
                    const appDate = app.created_at ? new Date(app.created_at) : new Date();
                    return isSameDay(appDate, selectedDay);
                  });

                  if (dayApps.length === 0) {
                    return <p className="text-zinc-500 text-center py-8">No applications found for this day.</p>;
                  }

                  const totalPages = Math.ceil(dayApps.length / DAY_PAGE_SIZE);
                  const paginatedApps = dayApps.slice((dayModalPage - 1) * DAY_PAGE_SIZE, dayModalPage * DAY_PAGE_SIZE);

                  return (
                    <div className="flex flex-col gap-3">
                      {paginatedApps.map(app => (
                        <div key={app.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-colors">
                          <div>
                            <h4 className="font-semibold text-white">{app.job_title}</h4>
                            <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
                              <span className="flex items-center gap-1"><Building size={14} /> {app.company}</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 uppercase tracking-wider">{app.stage}</span>
                              {(() => {
                                const jt = getAppJobType(app);
                                if (!jt) return null;
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                                    jt === 'remote'
                                      ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                                      : jt === 'hybrid'
                                      ? 'bg-purple-950/40 border-purple-800/60 text-purple-300'
                                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                                  }`}>
                                    {jt === 'remote' ? '🌐 Remote' : jt === 'hybrid' ? '⚡ Hybrid' : '🏢 Onsite'}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <button
                            onClick={() => openAppPreview(app.id)}
                            className="px-4 py-2 bg-white text-black font-semibold text-sm rounded-lg hover:bg-zinc-200 transition-colors"
                          >
                            Preview
                          </button>
                        </div>
                      ))}

                      {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4 border-t border-zinc-800 pt-4">
                          <button
                            onClick={() => setDayModalPage(p => Math.max(1, p - 1))}
                            disabled={dayModalPage === 1}
                            className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded disabled:opacity-50 text-sm"
                          >
                            Previous
                          </button>
                          <span className="text-sm text-zinc-500">Page {dayModalPage} of {totalPages}</span>
                          <button
                            onClick={() => setDayModalPage(p => Math.min(totalPages, p + 1))}
                            disabled={dayModalPage === totalPages}
                            className="px-3 py-1 bg-zinc-800 text-zinc-300 rounded disabled:opacity-50 text-sm"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <h3 className="text-xl font-bold mb-6">Add Application</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Company</label>
                  <input
                    type="text"
                    value={newApp.company}
                    onChange={e => setNewApp({ ...newApp, company: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Job Title</label>
                  <input
                    type="text"
                    value={newApp.jobTitle}
                    onChange={e => setNewApp({ ...newApp, jobTitle: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none"
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Source</label>
                    <select
                      value={newApp.source}
                      onChange={e => setNewApp({ ...newApp, source: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none"
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Wellfound">Wellfound</option>
                      <option value="Direct">Direct Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Date</label>
                    <input
                      type="date"
                      value={newApp.created_at.split('T')[0]}
                      onChange={e => setNewApp({ ...newApp, created_at: new Date(e.target.value).toISOString() })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-sm focus:border-zinc-500 outline-none style-color-scheme-dark"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Job Description</label>
                  <textarea
                    value={newApp.job_description}
                    onChange={e => setNewApp({ ...newApp, job_description: e.target.value })}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none resize-y"
                    placeholder="Paste job description here..."
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Attach Cover Letter from DB (Optional)</label>
                  <select
                    value={newApp.cover_letter_url}
                    onChange={e => setNewApp({ ...newApp, cover_letter_url: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-zinc-300"
                  >
                    <option value="">-- No Cover Letter attached --</option>
                    {coverLetters.map(cl => (
                      <option key={cl.id} value={cl.id}>{cl.jobTitle} at {cl.company}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Attach CV from CV Tailor (Optional)</label>
                  <select
                    value={newApp.linked_cv_id}
                    onChange={e => setNewApp({ ...newApp, linked_cv_id: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-zinc-300"
                  >
                    <option value="">-- No CV attached --</option>
                    {cvs.map(cv => (
                      <option key={cv.id} value={cv.id}>{cv.jobTitle} at {cv.company}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">Select a tailored CV to link to this application.</p>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-white p-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newApp.company || !newApp.jobTitle || isCreating}
                  className="flex-1 bg-white text-black p-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application Detail Slide-over Modal */}
      {selectedAppId && (
        <ApplicationModal
          appId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onUpdate={(updated) => {
            setApplications(apps => apps.map(a => a.id === updated.id ? updated : a));
          }}
          cvs={cvs}
          coverLetters={coverLetters}
        />
      )}
    </div>
  );
}
