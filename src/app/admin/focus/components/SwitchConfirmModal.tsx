import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface SwitchConfirmModalProps {
  isOpen: boolean;
  incompleteCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SwitchConfirmModal({ isOpen, incompleteCount, onConfirm, onCancel }: SwitchConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-yellow-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 text-yellow-500 rounded-lg">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Incomplete Tasks</h3>
              </div>
              <button 
                onClick={onCancel}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-slate-300 text-lg">
                Your current focused project still has <span className="font-bold text-yellow-500">{incompleteCount} incomplete task{incompleteCount === 1 ? '' : 's'}</span>.
              </p>
              <p className="text-slate-500 mt-2">
                Are you sure you want to switch focus? You can always come back to it later.
              </p>
            </div>

            <div className="p-6 border-t border-slate-800 flex gap-3 justify-end bg-slate-900/50">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-yellow-900/20"
              >
                Switch Anyway
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
