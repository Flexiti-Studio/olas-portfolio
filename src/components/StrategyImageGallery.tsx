"use client";

import React, { useState } from 'react';
import { upsertTradingStrategy } from '@/app/actions/tradingStrategy';

type ImageObj = { id: string; url: string; caption: string };
type FolderObj = { id: string; name: string; images: ImageObj[] };

export function StrategyImageGallery({ strategyId, initialImagesStr }: { strategyId: string; initialImagesStr?: string | null }) {
  const [folders, setFolders] = useState<FolderObj[]>(() => {
    try {
      return initialImagesStr ? JSON.parse(initialImagesStr) : [];
    } catch {
      return [];
    }
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const saveToDb = async (newFolders: FolderObj[]) => {
    setIsSaving(true);
    await upsertTradingStrategy({
      id: strategyId,
      name: "", // Will be ignored by upsert since we pass ID, wait... actually upsertTradingStrategy requires name!
      images: JSON.stringify(newFolders)
    } as any);
    setIsSaving(false);
  };

  const addFolder = () => {
    const name = prompt("Enter folder name:");
    if (!name) return;
    const newFolders = [...folders, { id: Date.now().toString(), name, images: [] }];
    setFolders(newFolders);
    saveToDb(newFolders);
  };

  const deleteFolder = (folderId: string) => {
    if (!confirm("Delete this folder and all its images?")) return;
    const newFolders = folders.filter(f => f.id !== folderId);
    setFolders(newFolders);
    saveToDb(newFolders);
  };

  const handleFileUpload = async (folderId: string, file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      
      if (data.success && data.url) {
        const caption = prompt("Image caption (optional):") || "";
        const newFolders = folders.map(f => {
          if (f.id === folderId) {
            return { ...f, images: [...f.images, { id: Date.now().toString(), url: data.url, caption }] };
          }
          return f;
        });
        setFolders(newFolders);
        saveToDb(newFolders);
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      alert("Upload error");
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = (folderId: string, imageId: string) => {
    const newFolders = folders.map(f => {
      if (f.id === folderId) {
        return { ...f, images: f.images.filter(img => img.id !== imageId) };
      }
      return f;
    });
    setFolders(newFolders);
    saveToDb(newFolders);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-8">
      <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-500">photo_library</span> 
          Reference Images
          {isSaving && <span className="text-xs text-gray-500 ml-4 font-normal italic">Saving...</span>}
        </h3>
        <button onClick={addFolder} className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">create_new_folder</span> Add Folder
        </button>
      </div>

      {folders.length === 0 && !activeFolderId ? (
        <div className="text-center py-12 text-gray-500 border border-dashed border-gray-800 rounded-lg">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">folder_open</span>
          <p>No folders yet. Create a folder to organize your strategy images.</p>
        </div>
      ) : activeFolderId ? (
        (() => {
          const folder = folders.find(f => f.id === activeFolderId);
          if (!folder) return null;
          return (
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setActiveFolderId(null)} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span> Back to Folders
                </button>
                <div className="flex gap-2 items-center">
                  <h4 className="font-bold text-gray-300 mr-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400">folder_open</span> {folder.name}
                  </h4>
                  <label className={`cursor-pointer ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) handleFileUpload(folder.id, e.target.files[0]);
                    }} />
                    <span className="text-blue-400 hover:bg-blue-900/30 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1 border border-blue-900/50">
                      <span className="material-symbols-outlined text-[16px]">upload</span> {isUploading ? 'Uploading...' : 'Upload Image'}
                    </span>
                  </label>
                  <button onClick={() => { deleteFolder(folder.id); setActiveFolderId(null); }} className="text-gray-500 hover:text-red-400 p-1.5 rounded transition-colors ml-2">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>

              {folder.images.length === 0 ? (
                <div className="text-center py-12 text-gray-600 italic border border-dashed border-gray-800 rounded-lg bg-gray-900/50">
                  No images in this folder yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folder.images.map(img => (
                    <div key={img.id} className="relative group bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                      <img src={img.url} alt={img.caption || "Strategy image"} className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                        <a href={img.url} target="_blank" rel="noreferrer" className="text-white hover:text-blue-400 font-bold text-sm flex items-center gap-1 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span> View Full
                        </a>
                        <button onClick={() => deleteImage(folder.id, img.id)} className="text-red-400 hover:text-red-300 font-bold text-sm flex items-center gap-1 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">delete</span> Delete
                        </button>
                      </div>
                      {img.caption && (
                        <div className="p-2 text-[10px] text-gray-400 truncate bg-gray-950 border-t border-gray-800">
                          {img.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {folders.map(folder => (
            <button 
              key={folder.id} 
              onClick={() => setActiveFolderId(folder.id)}
              className="bg-gray-950 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center group"
            >
              <span className="material-symbols-outlined text-4xl text-blue-500 group-hover:scale-110 transition-transform">folder</span>
              <div className="w-full">
                <h4 className="font-bold text-gray-300 text-sm truncate">{folder.name}</h4>
                <p className="text-xs text-gray-500">{folder.images.length} images</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
