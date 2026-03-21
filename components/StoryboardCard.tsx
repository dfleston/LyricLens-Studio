
import React, { useState, useMemo } from 'react';
import { StoryboardSegment, Character } from '../types';
import MermaidChart from './MermaidChart';
import { generateDiagram } from '../services/geminiService';

interface StoryboardCardProps {
  segment: StoryboardSegment;
  characters: Character[];
  onUpdate: (updated: StoryboardSegment) => void;
  onRemove?: () => void;
  onProcess?: () => void;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({ segment, characters, onUpdate, onRemove, onProcess }) => {
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

  const handleChange = (field: keyof StoryboardSegment, value: string) => {
    onUpdate({ ...segment, [field]: value });
  };

  const combinedText = useMemo(() => {
    return (segment.visuals + ' ' + segment.cameraWork + ' ' + segment.lightingMood).toLowerCase();
  }, [segment.visuals, segment.cameraWork, segment.lightingMood]);

  const handleBuildDiagram = async () => {
    setIsGeneratingDiagram(true);
    try {
      const diagram = await generateDiagram(segment);
      onUpdate({ ...segment, mermaidDiagram: diagram });
    } catch (err) { console.error(err); } finally { setIsGeneratingDiagram(false); }
  };

  const insertCharacter = (field: keyof StoryboardSegment, name: string) => {
    const currentValue = (segment[field] as string) || '';
    const newValue = currentValue.endsWith(' ') || currentValue === '' ? currentValue + name : currentValue + ' ' + name;
    handleChange(field, newValue);
  };

  const CharacterShortcuts = ({ field }: { field: keyof StoryboardSegment }) => {
    if (!characters || characters.length === 0) return null;
    return (
      <div className="flex gap-1 overflow-x-auto max-w-[200px] no-scrollbar">
        {characters.map(c => (
          <button key={c.id} onClick={() => insertCharacter(field, c.name)} className={`text-[8px] border px-2 py-0.5 rounded uppercase font-bold tracking-tighter transition-all ${combinedText.includes(c.name.toLowerCase()) ? 'bg-blue-600/30 border-blue-400 text-blue-300' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
            {c.name}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="group bg-slate-800/40 border border-slate-700/50 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all backdrop-blur-sm shadow-2xl mb-8">
      <div className="flex flex-col lg:flex-row">
        {/* Visual Preview Panel */}
        <div className="w-full lg:w-1/3 p-6 bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-700/50 flex flex-col justify-between space-y-6">
           <div>
              <div className="flex justify-between items-center mb-4">
                 <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">{segment.sectionTitle}</span>
                 {onRemove && <button onClick={onRemove} className="text-slate-600 hover:text-red-400"><i className="fa-solid fa-trash-can text-xs"></i></button>}
              </div>
              <p className="text-lg font-serif italic text-slate-300 mb-6">"{segment.lyrics}"</p>
           </div>
           
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                 <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-white/5">
                    {segment.firstFrame ? <img src={segment.firstFrame} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-800 uppercase font-black">Frame A</div>}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[7px] font-black uppercase text-blue-400">Start</span>
                 </div>
                 <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-white/5">
                    {segment.lastFrame ? <img src={segment.lastFrame} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-800 uppercase font-black">Frame B</div>}
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[7px] font-black uppercase text-indigo-400">Peak</span>
                 </div>
              </div>
              {onProcess && (
                <button onClick={onProcess} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${segment.firstFrame ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/20'}`}>
                  <i className={`fa-solid ${segment.firstFrame ? 'fa-rotate' : 'fa-wand-magic-sparkles'} mr-2`}></i>
                  {segment.firstFrame ? 'Regenerate Suite' : 'Process Visuals'}
                </button>
              )}
           </div>
        </div>

        {/* Content & Logic Panel */}
        <div className="w-full lg:w-2/3 p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-6">
              <div>
                 <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Narrative</label><CharacterShortcuts field="visuals" /></div>
                 <textarea value={segment.visuals} onChange={(e) => handleChange('visuals', e.target.value)} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-2xl p-4 text-sm text-slate-200 focus:border-blue-500/50 outline-none h-40 resize-none shadow-inner" placeholder="AI-generated description..." />
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                   <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Camera Dynamics</label><CharacterShortcuts field="cameraWork" /></div>
                   <textarea value={segment.cameraWork} onChange={(e) => handleChange('cameraWork', e.target.value)} rows={3} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 focus:border-blue-500/50 outline-none resize-none" placeholder="Lens, movement..." />
                </div>
                <div>
                   <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Atmosphere</label><CharacterShortcuts field="lightingMood" /></div>
                   <textarea value={segment.lightingMood} onChange={(e) => handleChange('lightingMood', e.target.value)} rows={3} className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 text-xs text-slate-400 focus:border-blue-500/50 outline-none resize-none" placeholder="Lighting, colors..." />
                </div>
              </div>
           </div>
           
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Architectural Map</label>
                 <button onClick={handleBuildDiagram} disabled={isGeneratingDiagram || !segment.visuals} className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-2">
                    {isGeneratingDiagram ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
                    {segment.mermaidDiagram ? 'Sync Map' : 'Build Map'}
                 </button>
              </div>
              <div className="w-full h-[400px] bg-slate-900/50 border border-slate-700/50 rounded-[2rem] overflow-auto flex items-center justify-center p-4">
                 {segment.mermaidDiagram ? <MermaidChart chart={segment.mermaidDiagram} id={segment.id} /> : <span className="text-[10px] text-slate-700 uppercase font-black">Awaiting logic sync</span>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardCard;
