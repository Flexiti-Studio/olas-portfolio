import { motion, AnimatePresence } from "framer-motion";
import { AlertOctagon, X, Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, title, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-red-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 text-red-500 rounded-lg">
                  <AlertOctagon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Delete Project</h3>
              </div>
              <button 
                onClick={onCancel}
                disabled={isDeleting}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-300 text-lg">
                Are you sure you want to delete <span className="font-bold text-red-400">"{title}"</span>?
              </p>
              <p className="text-slate-500 mt-2">
                This will permanently delete the project, along with all of its tasks and subtasks. This action cannot be undone.
              </p>
            </div>

            <div className="p-6 border-t border-slate-800 flex gap-3 justify-end bg-slate-900/50">
              <button
                onClick={onCancel}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-red-900/20 disabled:opacity-70"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : null}
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
