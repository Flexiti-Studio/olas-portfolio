import { PartyPopper } from "lucide-react";
import { ProjectQueueList } from "./ProjectQueueList";

export function ProjectCompleteModal({ onClose, onPickNext, queue }: { onClose: () => void, onPickNext: (id: string) => void, queue: any[] }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
          <PartyPopper className="w-8 h-8 text-blue-500" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Project Complete!</h2>
        <p className="text-slate-400 mb-8">Great job finishing that up. What's next?</p>
        
        <div className="text-left mb-8 max-h-64 overflow-y-auto pr-2">
          <ProjectQueueList 
            projects={queue} 
            onSwitchFocus={onPickNext} 
            isFocusedEmpty={false}
          />
        </div>

        <button 
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          Decide later
        </button>
      </div>
    </div>
  );
}
