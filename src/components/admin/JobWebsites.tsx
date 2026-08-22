import { useState, useEffect, useRef } from "react";
import { Plus, MoreVertical, Edit2, Trash2, Globe, ExternalLink, X } from "lucide-react";

interface JobWebsite {
  id: string;
  name: string;
  url: string;
  logo: string; // Base64 or URL
  category: string;
  rating?: number;
}

export default function JobWebsites() {
  const [websites, setWebsites] = useState<JobWebsite[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: "", url: "", logo: "", category: "", rating: 0 });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      const res = await fetch("/api/job-websites");
      if (res.ok) {
        const data = await res.json();
        setWebsites(data);
        updateCategories(data);
      }
    } catch (err) {
      console.error("Failed to load websites:", err);
      // Fallback to local storage if network fails
      const stored = localStorage.getItem("job_websites");
      if (stored) {
        const parsed = JSON.parse(stored);
        setWebsites(parsed);
        updateCategories(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const syncToDatabase = async (data: JobWebsite[]) => {
    localStorage.setItem("job_websites", JSON.stringify(data));
    try {
      await fetch("/api/job-websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("Failed to sync websites:", err);
    }
  };

  const updateCategories = (sites: JobWebsite[]) => {
    const cats = Array.from(new Set(sites.map(s => s.category).filter(Boolean)));
    setCategories(["All", ...cats]);
  };

  const handleSave = () => {
    if (!formData.name || !formData.url) return;
    
    let updated;
    if (editingId) {
      updated = websites.map(w => w.id === editingId ? { ...formData, id: editingId } : w);
    } else {
      updated = [...websites, { ...formData, id: Date.now().toString() }];
    }
    
    setWebsites(updated);
    updateCategories(updated);
    syncToDatabase(updated);
    
    setIsModalOpen(false);
    setFormData({ name: "", url: "", logo: "", category: "", rating: 0 });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = websites.filter(w => w.id !== id);
    setWebsites(updated);
    updateCategories(updated);
    syncToDatabase(updated);
    setActiveDropdown(null);
  };

  const handleEdit = (site: JobWebsite) => {
    setFormData({ name: site.name, url: site.url, logo: site.logo, category: site.category, rating: site.rating || 0 });
    setEditingId(site.id);
    setIsModalOpen(true);
    setActiveDropdown(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredWebsites = activeCategory === "All" 
    ? websites 
    : websites.filter(w => w.category === activeCategory);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white rounded-2xl border border-zinc-800 p-6">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Job Websites</h2>
          <p className="text-zinc-400 text-sm mt-1">Manage and access your job application platforms.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ name: "", url: "", logo: "", category: "", rating: 0 });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-zinc-200"
        >
          <Plus size={16} /> Add Website
        </button>
      </div>

      {/* Filters */}
      {categories.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat ? "bg-zinc-800 text-white" : "bg-transparent text-zinc-500 hover:text-zinc-300 border border-zinc-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredWebsites.map(site => (
          <div 
            key={site.id} 
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col relative group hover:border-zinc-700 transition-colors cursor-pointer"
            onClick={() => window.open(site.url.startsWith('http') ? site.url : `https://${site.url}`, '_blank')}
          >
            {/* Options Dropdown */}
            <div className="absolute top-3 right-3" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setActiveDropdown(activeDropdown === site.id ? null : site.id)}
                className="text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800"
              >
                <MoreVertical size={16} />
              </button>
              
              {activeDropdown === site.id && (
                <div className="absolute right-0 mt-1 w-32 bg-zinc-800 rounded-lg shadow-xl border border-zinc-700 z-10 py-1 overflow-hidden">
                  <button 
                    onClick={() => handleEdit(site)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(site.id)}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center mb-4 text-center mt-2">
              <div className="w-20 h-20 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden mb-3 flex-shrink-0 shadow-inner">
                {site.logo ? (
                  <img src={site.logo} alt={site.name} className="w-full h-full object-cover" />
                ) : (
                  <Globe className="text-zinc-500" size={32} />
                )}
              </div>
              <h3 className="font-semibold text-white truncate w-full px-2 text-lg">{site.name}</h3>
              
              {/* Star Rating Display */}
              {site.rating !== undefined && site.rating > 0 && (
                <div className="flex items-center mt-2 gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`text-sm ${star <= site.rating! ? 'text-amber-400' : 'text-zinc-700'}`}>
                      ★
                    </span>
                  ))}
                </div>
              )}

              <span className="text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full mt-2 inline-block truncate max-w-full">
                {site.category || "Uncategorized"}
              </span>
            </div>
            
            <div className="mt-auto pt-3 border-t border-zinc-800/50 flex items-center justify-center text-zinc-500 group-hover:text-zinc-300">
              <span className="text-xs truncate mr-2">{site.url.replace(/^https?:\/\//, '')}</span>
              <ExternalLink size={14} />
            </div>
          </div>
        ))}

        {isLoading ? (
          <div className="col-span-full py-12 text-center">
            <p className="text-zinc-500 text-sm">Loading websites...</p>
          </div>
        ) : filteredWebsites.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
            <Globe className="mx-auto text-zinc-600 mb-4" size={32} />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">No websites found</h3>
            <p className="text-zinc-500 text-sm">Add your first job platform to get started.</p>
          </div>
        ) : null}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold mb-6">{editingId ? 'Edit Website' : 'Add Website'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Website Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none"
                  placeholder="e.g. LinkedIn"
                />
              </div>
              
              <div>
                <label className="text-xs text-zinc-400 block mb-1">URL / Link</label>
                <input 
                  type="text" 
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none"
                  placeholder="e.g. linkedin.com/jobs"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Category</label>
                <input 
                  type="text" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none"
                  placeholder="e.g. Remote, Freelance, Aggregator"
                  list="categoryList"
                />
                <datalist id="categoryList">
                  {categories.filter(c => c !== "All").map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Rating</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className={`text-2xl transition-colors ${
                        star <= formData.rating ? "text-amber-400" : "text-zinc-700 hover:text-amber-400/50"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="text-zinc-600" size={20} />
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-zinc-800 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
                  >
                    Upload Image
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleSave}
              disabled={!formData.name || !formData.url}
              className="w-full mt-8 bg-white text-black p-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
            >
              {editingId ? 'Save Changes' : 'Add Website'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
