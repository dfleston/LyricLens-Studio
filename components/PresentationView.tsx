
import React, { useEffect, useState, useMemo } from 'react';
import { StoryboardSegment, Character } from '../types';
import MermaidChart from './MermaidChart';
import { generateSceneContent, generateDiagram } from '../services/geminiService';
import HighlightText from './HighlightText';

interface PresentationViewProps {
  segments: StoryboardSegment[];
  characters: Character[];
  currentIndex: number;
  onUpdateSegment: (index: number, updated: StoryboardSegment) => void;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
  narrativeSeed: string;
}

const PresentationView: React.FC<PresentationViewProps> = ({ 
  segments, 
  characters,
  currentIndex, 
  onUpdateSegment,
  onNext, 
  onPrev, 
  onExit,
  narrativeSeed
}) => {
  const current = segments[currentIndex];
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'ArrowRight' || e.key === ' ') && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
        onNext();
      }
      if (e.key === 'ArrowLeft' && (e.target as HTMLElement).tagName !== 'TEXTAREA' && (e.target as HTMLElement).tagName !== 'INPUT') {
        onPrev();
      }
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrev, onExit]);

  const handleFieldChange = (field: keyof StoryboardSegment, value: string) => {
    onUpdateSegment(currentIndex, { ...current, [field]: value });
  };

  const combinedText = useMemo(() => {
    if (!current) return '';
    return (current.visuals + ' ' + current.cameraWork + ' ' + current.lightingMood).toLowerCase();
  }, [current?.visuals, current?.cameraWork, current?.lightingMood]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const aiData = await generateSceneContent(current.lyrics, "Musical Video Storyboard", narrativeSeed, characters);
      const updated = { ...current, ...aiData };
      const newDiagram = await generateDiagram(updated as StoryboardSegment);
      onUpdateSegment(currentIndex, { ...updated, mermaidDiagram: newDiagram });
    } catch (err) {
      console.error("Failed to regenerate scene:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const insertCharacter = (field: keyof StoryboardSegment, name: string) => {
    const currentValue = (current[field] as string) || '';
    const newValue = currentValue.endsWith(' ') || currentValue === '' ? currentValue + name : currentValue + ' ' + name;
    handleFieldChange(field, newValue);
  };

  const CharacterShortcuts = ({ field }: { field: keyof StoryboardSegment }) => {
    if (!characters || characters.length === 0) return null;
    return (
      <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar py-1">
        {characters.map(c => {
          const isMentioned = combinedText.includes(c.name.toLowerCase());
          return (
            <button 
              key={c.id}
              onClick={() => insertCharacter(field, c.name)}
              className={`text-[9px] border px-1.5 py-0.5 rounded transition-all whitespace-nowrap font-bold uppercase tracking-tighter
                ${isMentioned 
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                  : 'bg-white/5 border-white/10 text-slate-500 hover:border-blue-500/50 hover:text-white'
                }`}
              title={`Mention ${c.name}`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
    );
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col animate-in fade-in duration-500 overflow-hidden font-sans">
      {/* Header HUD */}
      <div className="p-4 flex justify-between items-center bg-zinc-900/80 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={onExit}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <div>
            <input 
              value={current.sectionTitle}
              onChange={(e) => handleFieldChange('sectionTitle', e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-lg font-black text-blue-500 uppercase tracking-tighter p-0 w-64"
            />
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Cinema Mode • Frame {currentIndex + 1} / {segments.length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsPreviewMode(!isPreviewMode)}
             className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all
               ${isPreviewMode ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
           >
             <i className={`fa-solid ${isPreviewMode ? 'fa-eye' : 'fa-pen-to-square'} mr-2`}></i>
             {isPreviewMode ? 'Preview Mode' : 'Edit Mode'}
           </button>
           <button 
             onClick={handleRegenerate}
             disabled={isRegenerating}
             className="text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20 disabled:opacity-50 transition-all"
           >
             <i className={`fa-solid fa-wand-magic-sparkles ${isRegenerating ? 'animate-spin' : ''}`}></i>
             {isRegenerating ? 'Syncing...' : 'Redraft Scene'}
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row p-4 md:p-8 gap-6 md:gap-10 min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Left Side: Editorial */}
        <div className="w-full md:w-[45%] flex flex-col gap-8 md:overflow-y-auto pr-0 md:pr-4 custom-scrollbar">
          <div className="space-y-4">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Current Script</span>
             <blockquote className="text-xl md:text-3xl font-serif italic text-white leading-relaxed bg-zinc-900/40 p-6 md:p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
               "{current.lyrics}"
             </blockquote>
          </div>

          <div className="space-y-8 pt-6 border-t border-white/10">
            <div>
               <div className="flex justify-between items-center mb-4">
                 <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-clapperboard"></i> Action Narrative
                 </h4>
                 {!isPreviewMode && <CharacterShortcuts field="visuals" />}
               </div>
               {isPreviewMode ? (
                 <div className="w-full bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 md:p-8 text-lg md:text-xl text-slate-200 leading-relaxed min-h-[140px] shadow-inner">
                   <HighlightText text={current.visuals} characters={characters} />
                 </div>
               ) : (
                 <textarea 
                    value={current.visuals}
                    onChange={(e) => handleFieldChange('visuals', e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-[2rem] p-6 text-base text-slate-300 leading-relaxed outline-none focus:border-blue-500/50 h-48 resize-none shadow-inner"
                    placeholder="Describe the cinematic action..."
                 />
               )}
            </div>
            
            <div className="flex flex-col gap-8">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-video"></i> Camera Configuration
                  </h4>
                  {!isPreviewMode && <CharacterShortcuts field="cameraWork" />}
                </div>
                {isPreviewMode ? (
                  <div className="w-full bg-zinc-900/40 border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium text-slate-300 min-h-[100px] shadow-inner">
                    <HighlightText text={current.cameraWork} characters={characters} />
                  </div>
                ) : (
                  <textarea 
                    value={current.cameraWork}
                    onChange={(e) => handleFieldChange('cameraWork', e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-white/10 rounded-[1.5rem] p-5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500/50 resize-none shadow-inner"
                    placeholder="Lens, movement, focus..."
                  />
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb"></i> Lighting Setup
                  </h4>
                  {!isPreviewMode && <CharacterShortcuts field="lightingMood" />}
                </div>
                {isPreviewMode ? (
                  <div className="w-full bg-zinc-900/40 border border-white/5 rounded-[1.5rem] p-5 text-sm font-medium text-slate-300 min-h-[100px] shadow-inner">
                    <HighlightText text={current.lightingMood} characters={characters} />
                  </div>
                ) : (
                  <textarea 
                    value={current.lightingMood}
                    onChange={(e) => handleFieldChange('lightingMood', e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-white/10 rounded-[1.5rem] p-5 text-sm font-medium text-slate-300 outline-none focus:border-blue-500/50 resize-none shadow-inner"
                    placeholder="Gaffer notes, color temps..."
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Architecture - Responsive Diagram Box */}
        <div className="w-full md:flex-1 flex flex-col bg-zinc-950/80 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden min-h-[500px] md:min-h-0 relative">
          <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Architectural Map</h4>
             <button 
              onClick={async () => {
                const diag = await generateDiagram(current);
                handleFieldChange('mermaidDiagram', diag);
              }}
              className="text-[10px] font-black text-blue-400 hover:text-blue-300 flex items-center gap-2 uppercase tracking-widest"
             >
               <i className="fa-solid fa-rotate"></i> Re-Route
             </button>
          </div>
          <div className="flex-1 overflow-auto p-6 md:p-10 flex items-start justify-center custom-scrollbar">
            {current.mermaidDiagram ? (
              <div className="w-full h-full min-h-[350px]">
                <MermaidChart chart={current.mermaidDiagram} id={`pres-${current.id}`} />
              </div>
            ) : (
              <div className="self-center flex flex-col items-center gap-6 text-slate-700">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/5">
                   <i className="fa-solid fa-diagram-project text-3xl opacity-20"></i>
                </div>
                <div className="text-center">
                   <p className="italic text-sm font-medium mb-1">Architecture pending sync</p>
                   <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Logical flow not yet calculated</p>
                </div>
                <button 
                  onClick={async () => {
                    const diag = await generateDiagram(current);
                    handleFieldChange('mermaidDiagram', diag);
                  }}
                  className="px-6 py-3 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  Sync Map Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-6 flex justify-between items-center bg-zinc-950 border-t border-white/10 shrink-0">
        <button 
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="group flex items-center gap-4 px-6 md:px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-10 transition-all border border-white/5"
        >
          <i className="fa-solid fa-arrow-left text-xs group-hover:-translate-x-1 transition-transform"></i>
          <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Previous</span>
        </button>

        <div className="flex-1 flex justify-center gap-3">
          {(characters || []).map(c => {
            const isMentioned = combinedText.includes(c.name.toLowerCase());
            const charImg = c.images && c.images.length > 0 ? c.images[0] : null;
            return (
              <div 
                key={c.id} 
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 transition-all overflow-hidden flex items-center justify-center shadow-lg
                  ${isMentioned 
                    ? 'border-blue-500 scale-125 shadow-[0_0_20px_rgba(59,130,246,0.6)]' 
                    : 'border-white/5 opacity-30 grayscale blur-[0.5px]'
                  }`}
                title={c.name}
              >
                {charImg ? (
                  <img src={charImg} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-black uppercase">{c.name[0]}</div>
                )}
              </div>
            );
          })}
        </div>

        <button 
          onClick={onNext}
          disabled={currentIndex === segments.length - 1}
          className="group flex items-center gap-4 px-6 md:px-10 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-10 transition-all shadow-xl shadow-blue-500/30"
        >
          <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest text-white">Next Frame</span>
          <i className="fa-solid fa-arrow-right text-xs text-white group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
};

export default PresentationView;
