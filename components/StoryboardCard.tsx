
import React, { useState } from 'react';
import { StoryboardSegment } from '../types';
import MermaidChart from './MermaidChart';
import { generateDiagram } from '../services/geminiService';

interface StoryboardCardProps {
  segment: StoryboardSegment;
  onUpdate: (updated: StoryboardSegment) => void;
  onRemove?: () => void;
}

const StoryboardCard: React.FC<StoryboardCardProps> = ({ segment, onUpdate, onRemove }) => {
  const [isGeneratingDiagram, setIsGeneratingDiagram] = useState(false);

  const handleChange = (field: keyof StoryboardSegment, value: string) => {
    onUpdate({ ...segment, [field]: value });
  };

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

  return (
    <div className="group relative bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 backdrop-blur-sm shadow-xl mb-6">
      <div className="flex flex-col md:flex-row">
        {/* Left Side: Lyrics (Read Only usually) */}
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <i className="fa-solid fa-clapperboard"></i> Visual Content
                </label>
                <textarea 
                  value={segment.visuals}
                  onChange={(e) => handleChange('visuals', e.target.value)}
                  placeholder="Describe what we see..."
                  className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-3 text-sm text-slate-200 outline-none focus:border-blue-500/50 h-24 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-video"></i> Camera
                  </label>
                  <input 
                    value={segment.cameraWork}
                    onChange={(e) => handleChange('cameraWork', e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-lightbulb"></i> Lighting
                  </label>
                  <input 
                    value={segment.lightingMood}
                    onChange={(e) => handleChange('lightingMood', e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 text-xs text-slate-300 outline-none focus:border-blue-500/50"
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
                <MermaidChart chart={segment.mermaidDiagram} id={segment.id} />
              ) : (
                <div className="h-32 bg-slate-900/30 border border-dashed border-slate-700/50 rounded-xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
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
