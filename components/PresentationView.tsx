
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
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/10"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
          <div>
            <input 
              value={current.sectionTitle}
              onChange={(e) => handleFieldChange('sectionTitle', e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-blue-500 uppercase tracking-widest p-0 w-48"
            />
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Production Mode • Scene {currentIndex + 1} of {segments.length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setIsPreviewMode(!isPreviewMode)}
             className={`px-3 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-widest transition-all
               ${isPreviewMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
           >
             <i className={`fa-solid ${isPreviewMode ? 'fa-eye' : 'fa-pen-to-square'} mr-2`}></i>
             {isPreviewMode ? 'Preview Mode' : 'Edit Mode'}
           </button>
           <button 
             onClick={handleRegenerate}
             disabled={isRegenerating}
             className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-md border border-blue-500/20 disabled:opacity-50"
           >
             <i className={`fa-solid fa-wand-magic-sparkles ${isRegenerating ? 'animate-spin' : ''}`}></i>
             {isRegenerating ? 'Recreating...' : 'Recreate Scene'}
           </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row p-6 md:p-8 gap-8 min-h-0">
        {/* Left Side: Editorial */}
        <div className="w-full md:w-[45%] flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-3">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Lyrics</span>
             <blockquote className="text-2xl md:text-3xl font-serif italic text-slate-100 leading-snug bg-zinc-900/40 p-6 rounded-2xl border border-white/5">
               "{current.lyrics}"
             </blockquote>
          </div>

          <div className="space-y-6 pt-2 border-t border-white/10">
            <div>
               <div className="flex justify-between items-center mb-3">
                 <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2">
                   <i className="fa-solid fa-clapperboard"></i> Action & Visuals
                 </h4>
                 {!isPreviewMode && <CharacterShortcuts field="visuals" />}
               </div>
               {isPreviewMode ? (
                 <div className="w-full bg-zinc-900/40 border border-white/5 rounded-xl p-6 text-xl text-slate-200 leading-relaxed min-h-[160px]">
                   <HighlightText text={current.visuals} characters={characters} />
                 </div>
               ) : (
                 <textarea 
                    value={current.visuals}
                    onChange={(e) => handleFieldChange('visuals', e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-4 text-base text-slate-300 leading-relaxed outline-none focus:border-blue-500/50 min-h-[160px] resize-none"
                    placeholder="Describe the action..."
                 />
               )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-video"></i> Camera
                  </h4>
                  {!isPreviewMode && <CharacterShortcuts field="cameraWork" />}
                </div>
                {isPreviewMode ? (
                  <div className="w-full bg-zinc-900/40 border border-white/5 rounded-lg p-3 text-sm font-medium text-slate-300">
                    <HighlightText text={current.cameraWork} characters={characters} />
                  </div>
                ) : (
                  <input 
                    value={current.cameraWork}
                    onChange={(e) => handleFieldChange('cameraWork', e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm font-medium text-slate-300 outline-none focus:border-blue-500/50"
                  />
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb"></i> Lighting
                  </h4>
                  {!isPreviewMode && <CharacterShortcuts field="lightingMood" />}
                </div>
                {isPreviewMode ? (
                  <div className="w-full bg-zinc-900/40 border border-white/5 rounded-lg p-3 text-sm font-medium text-slate-300">
                    <HighlightText text={current.lightingMood} characters={characters} />
                  </div>
                ) : (
                  <input 
                    value={current.lightingMood}
                    onChange={(e) => handleFieldChange('lightingMood', e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-sm font-medium text-slate-300 outline-none focus:border-blue-500/50"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Architecture */}
        <div className="flex-1 flex flex-col bg-zinc-900/60 rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
             <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scene Architecture Map</h4>
             <button 
              onClick={async () => {
                const diag = await generateDiagram(current);
                handleFieldChange('mermaidDiagram', diag);
              }}
              className="text-[10px] text-blue-400 hover:underline"
             >
               Refresh Diagram
             </button>
          </div>
          <div className="flex-1 overflow-auto p-8 flex items-start justify-center custom-scrollbar">
            {current.mermaidDiagram ? (
              <div className="w-full">
                <MermaidChart chart={current.mermaidDiagram} id={`pres-${current.id}`} />
              </div>
            ) : (
              <div className="self-center flex flex-col items-center gap-4 text-slate-600">
                <i className="fa-solid fa-diagram-project text-4xl opacity-20"></i>
                <p className="italic text-sm">Diagram pending reconstruction</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-4 flex justify-between items-center bg-zinc-900 border-t border-white/5 shrink-0">
        <button 
          onClick={onPrev}
          disabled={currentIndex === 0}
          className="group flex items-center gap-3 px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 transition-all border border-white/5"
        >
          <i className="fa-solid fa-arrow-left text-xs group-hover:-translate-x-1 transition-transform"></i>
          <span className="text-xs font-bold uppercase tracking-widest">Prev</span>
        </button>

        <div className="flex-1 flex justify-center gap-2">
          {(characters || []).map(c => {
            const isMentioned = combinedText.includes(c.name.toLowerCase());
            return (
              <div 
                key={c.id} 
                className={`w-10 h-10 rounded-full border-2 transition-all overflow-hidden flex items-center justify-center
                  ${isMentioned 
                    ? 'border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'border-white/10 opacity-40 grayscale'
                  }`}
                title={c.name}
              >
                {c.imageUrl ? (
                  <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold">{c.name[0]}</span>
                )}
              </div>
            );
          })}
        </div>

        <button 
          onClick={onNext}
          disabled={currentIndex === segments.length - 1}
          className="group flex items-center gap-3 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-20 transition-all shadow-lg shadow-blue-500/10"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-white">Next Scene</span>
          <i className="fa-solid fa-arrow-right text-xs text-white group-hover:translate-x-1 transition-transform"></i>
        </button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default PresentationView;
