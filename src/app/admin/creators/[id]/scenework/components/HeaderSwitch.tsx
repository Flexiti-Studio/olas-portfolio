import { useSceneworkStore } from "../store/useSceneworkStore";
import { motion } from "framer-motion";

export default function HeaderSwitch() {
  const { view, setView } = useSceneworkStore();

  return (
    <div className="flex bg-slate-900 border border-slate-800 rounded-full p-1 w-64 relative mx-auto mb-6">
      <button
        onClick={() => setView('story')}
        className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors relative z-10 ${
          view === 'story' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        Story
      </button>
      <button
        onClick={() => setView('scenes')}
        className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors relative z-10 ${
          view === 'scenes' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        Scenes
      </button>
      
      {/* Sliding pill */}
      <motion.div
        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-full shadow-sm"
        animate={{
          left: view === 'story' ? '4px' : 'calc(50% + 0px)'
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
