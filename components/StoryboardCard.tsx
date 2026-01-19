
import React, { useState, useMemo } from 'react';
import { StoryboardSegment, Character } from '../types';
import MermaidChart from './MermaidChart';
import { generateDiagram } from '../services/geminiService';

interface StoryboardCardProps {
  segment: StoryboardSegment;
  characters: Character[];
  onUpdate: (updated: StoryboardSegment) => void;
  onRemove?: () => void;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({ segment, characters, onUpdate, onRemove }) => {
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
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDiagram(false);
    }
  };

  const insertCharacter = (field: keyof StoryboardSegment, name: string) => {
    const currentValue = (segment[field] as string) || '';
    const newValue = currentValue.endsWith(' ') || currentValue === '' ? currentValue + name : currentValue + ' ' + name;
    handleChange(field, newValue);
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
              className={`text-[9px] border px-2 py-0.5 rounded transition-all whitespace-nowrap font-bold uppercase tracking-tighter
                ${isMentioned 
                  ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-105' 
                  : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
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

  return (
    <div className="group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm shadow-xl mb-6">
      <div className="flex flex-col md:flex-row">
        {/* Left Side: Lyrics */}
        <div className="w-full md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-slate-700/50 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <input 
              value={segment.sectionTitle}
              onChange={(e) => handleChange('sectionTitle', e.target.value)}
              className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider outline-none border border-transparent focus:border-blue-500/50"
            />
            {onRemove && (
              <button onClick={onRemove} className="text-slate-600 hover:text-red-400 transition-colors">
                <i className="fa-solid fa-trash-can text-xs"></i>
              </button>
            )}
          </div>
          <p className="text-base font-medium leading-relaxed italic text-slate-300 whitespace-pre-wrap font-serif">
            {segment.lyrics}
          </p>
        </div>

        {/* Right Side: Editable Visuals */}
        <div className="w-full md:w-2/3 p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-clapperboard"></i> Visual Content
                  </label>
                  <CharacterShortcuts field="visuals" />
                </div>
                <textarea 
                  value={segment.visuals}
                  onChange={(e) => handleChange('visuals', e.target.value)}
                  placeholder="Describe what we see..."
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-blue-500/50 h-32 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-video"></i> Camera
                    </label>
                    <CharacterShortcuts field="cameraWork" />
                  </div>
                  <textarea 
                    value={segment.cameraWork}
                    onChange={(e) => handleChange('cameraWork', e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-blue-500/50 resize-none"
                    placeholder="Describe camera movement, lens, and focus..."
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <i className="fa-solid fa-lightbulb"></i> Lighting & Mood
                    </label>
                    <CharacterShortcuts field="lightingMood" />
                  </div>
                  <textarea 
                    value={segment.lightingMood}
                    onChange={(e) => handleChange('lightingMood', e.target.value)}
                    rows={3}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-300 outline-none focus:border-blue-500/50 resize-none"
                    placeholder="Describe lighting setup, color palette, and atmospheric effects..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <i className="fa-solid fa-diagram-project"></i> Scene Architecture
                </label>
                <button 
                  onClick={handleBuildDiagram}
                  disabled={isGeneratingDiagram || !segment.visuals}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingDiagram ? (
                    <><i className="fa-solid fa-spinner animate-spin"></i> Processing</>
                  ) : (
                    <><i className="fa-solid fa-bolt"></i> {segment.mermaidDiagram ? 'Update Chart' : 'Build Chart'}</>
                  )}
                </button>
              </div>
              {segment.mermaidDiagram ? (
                <div className="w-full max-h-[350px] overflow-auto bg-slate-900/50 rounded-xl scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                  <MermaidChart chart={segment.mermaidDiagram} id={segment.id} />
                </div>
              ) : (
                <div className="h-full min-h-[150px] bg-slate-900/30 border border-dashed border-slate-700/50 rounded-xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
                  {segment.visuals ? 'Ready to generate architectural flow' : 'Enter visuals to enable diagramming'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryboardCard;
