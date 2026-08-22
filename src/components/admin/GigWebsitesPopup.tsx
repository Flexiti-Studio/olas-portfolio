import { useState, useEffect, useRef } from "react";
import { Plus, MoreVertical, Edit2, Trash2, Globe, ExternalLink, X } from "lucide-react";

interface GigWebsite {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
}

export default function GigWebsitesPopup({ onClose }: { onClose: () => void }) {
  const [websites, setWebsites] = useState<GigWebsite[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [activeCategory, setActiveCategory] = useState("All");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ name: "", url: "", logo: "", category: "" });
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      const res = await fetch("/api/gig-websites");
      if (res.ok) {
        const data = await res.json();
        setWebsites(data);
        updateCategories(data);
      }
    } catch (err) {
      console.error("Failed to load websites:", err);
      const stored = localStorage.getItem("gig_websites");
      if (stored) {
        const parsed = JSON.parse(stored);
        setWebsites(parsed);
        updateCategories(parsed);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const syncToDatabase = async (data: GigWebsite[]) => {
    localStorage.setItem("gig_websites", JSON.stringify(data));
    try {
      await fetch("/api/gig-websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (err) {
      console.error("Failed to sync websites:", err);
    }
  };

  const updateCategories = (sites: GigWebsite[]) => {
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
    setFormData({ name: "", url: "", logo: "", category: "" });
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = websites.filter(w => w.id !== id);
    setWebsites(updated);
    updateCategories(updated);
    syncToDatabase(updated);
    setActiveDropdown(null);
  };

  const handleEdit = (site: GigWebsite) => {
    setFormData({ name: site.name, url: site.url, logo: site.logo, category: site.category });
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="flex flex-col h-[90vh] w-[90vw] max-w-6xl bg-zinc-950 text-white rounded-2xl border border-zinc-800 p-6 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">Gig Websites</h2>
            <p className="text-zinc-400 text-sm mt-1">Manage your freelance and gig platforms.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setFormData({ name: "", url: "", logo: "", category: "" });
                setEditingId(null);
                setIsModalOpen(true);
              }}
              className="bg-white text-black px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-zinc-200"
            >
              <Plus size={16} /> Add Website
            </button>
            <button onClick={onClose} className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        {categories.length > 1 && (
          <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2 shrink-0">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-12">
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
              <p className="text-zinc-500 text-sm">Add your first gig platform to get started.</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add/Edit Modal (Nested) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.stopPropagation()}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1 rounded-md hover:bg-zinc-800"
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
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-white"
                  placeholder="e.g. Upwork"
                />
              </div>
              
              <div>
                <label className="text-xs text-zinc-400 block mb-1">URL</label>
                <input 
                  type="url" 
                  value={formData.url} 
                  onChange={e => setFormData({...formData, url: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-white"
                  placeholder="e.g. upwork.com"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Category</label>
                <input 
                  type="text" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm focus:border-zinc-500 outline-none text-white"
                  placeholder="e.g. Freelance, Design, Tech..."
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Logo (Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-shrink-0 items-center justify-center overflow-hidden">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Globe className="text-zinc-600" size={24} />
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-zinc-800 text-sm px-4 py-2 rounded-lg hover:bg-zinc-700 transition-colors text-white"
                  >
                    Upload Image
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!formData.name || !formData.url}
                className="bg-white text-black px-6 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
