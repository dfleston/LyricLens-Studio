
import React, { useState, useMemo, useRef } from 'react';
import { generateSceneContent } from './services/geminiService';
import { AppStep, StoryboardSegment, StoryboardProject } from './types';
import StoryboardCard from './components/StoryboardCard';

const App: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [narrativeSeed, setNarrativeSeed] = useState('');
  const [step, setStep] = useState<AppStep>(AppStep.PASTE_LYRICS);
  const [sceneMarkers, setSceneMarkers] = useState<number[]>([]);
  const [segments, setSegments] = useState<StoryboardSegment[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => rawText.split('\n').map(l => l.trim()).filter(l => l), [rawText]);

  const toggleMarker = (index: number) => {
    setSceneMarkers(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleStartDefining = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim()) setStep(AppStep.DEFINE_SCENES);
  };

  const handleProceedToProduction = async () => {
    setIsBulkProcessing(true);
    setStep(AppStep.PRODUCTION);
    
    const newSegments: StoryboardSegment[] = [];
    let currentLyrics: string[] = [];
    
    lines.forEach((line, idx) => {
      if (sceneMarkers.includes(idx) && currentLyrics.length > 0) {
        newSegments.push({
          id: `scene-${newSegments.length}`,
          sectionTitle: `Scene ${newSegments.length + 1}`,
          lyrics: currentLyrics.join('\n'),
          visuals: '',
          cameraWork: '',
          lightingMood: '',
        });
        currentLyrics = [];
      }
      currentLyrics.push(line);
    });
    
    if (currentLyrics.length > 0) {
      newSegments.push({
        id: `scene-${newSegments.length}`,
        sectionTitle: `Scene ${newSegments.length + 1}`,
        lyrics: currentLyrics.join('\n'),
        visuals: '',
        cameraWork: '',
        lightingMood: '',
      });
    }

    setSegments(newSegments);

    const populated = await Promise.all(newSegments.map(async (seg) => {
      try {
        const aiData = await generateSceneContent(seg.lyrics, "Musical Video Storyboard", narrativeSeed);
        return { ...seg, ...aiData };
      } catch (e) {
        return seg;
      }
    }));

    setSegments(populated);
    setIsBulkProcessing(false);
  };

  const updateSegment = (index: number, updated: StoryboardSegment) => {
    setSegments(prev => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  };

  const saveProject = () => {
    const project: StoryboardProject = {
      rawText,
      narrativeSeed,
      sceneMarkers,
      segments,
      step,
      version: "1.0.0"
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard-project-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string) as StoryboardProject;
        setRawText(project.rawText);
        setNarrativeSeed(project.narrativeSeed || '');
        setSceneMarkers(project.sceneMarkers || []);
        setSegments(project.segments || []);
        setStep(project.step || AppStep.PASTE_LYRICS);
      } catch (err) {
        alert("Failed to load project file. Invalid format.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 cursor-pointer" onClick={() => setStep(AppStep.PASTE_LYRICS)}>
              <i className="fa-solid fa-clapperboard text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-bold tracking-tight">LyricLens Studio</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-4">
              {[AppStep.PASTE_LYRICS, AppStep.DEFINE_SCENES, AppStep.PRODUCTION].map((s, idx) => (
                <React.Fragment key={s}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${step === s ? 'text-blue-500' : 'text-slate-600'}`}>
                    {s.replace('_', ' ')}
                  </div>
                  {idx < 2 && <div className="w-4 h-[1px] bg-slate-800"></div>}
                </React.Fragment>
              ))}
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={loadProject} 
              accept=".json" 
              className="hidden" 
            />

            <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
              <button 
                onClick={handleLoadClick}
                className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold"
                title="Load Project"
              >
                <i className="fa-solid fa-folder-open"></i> Load
              </button>
              <button 
                onClick={saveProject}
                className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold"
                title="Save Project"
              >
                <i className="fa-solid fa-floppy-disk"></i> Save
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {step === AppStep.PASTE_LYRICS && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Directing Desk</h2>
              <p className="text-slate-400">Set the narrative and paste your source text.</p>
            </div>
            <form onSubmit={handleStartDefining} className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block px-1">
                  Narrative Seed / Angle
                </label>
                <input
                  type="text"
                  value={narrativeSeed}
                  onChange={(e) => setNarrativeSeed(e.target.value)}
                  placeholder="e.g. A dystopian future with neon lighting, melancholy mood, focus on shadows"
                  className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-sm transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block px-1">
                  Lyrics / Script
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste lyrics or narrative text here..."
                  className="w-full h-80 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none text-lg transition-all resize-none font-serif"
                />
              </div>

              <button
                type="submit"
                disabled={!rawText.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
              >
                Proceed to Scene Layout
              </button>
            </form>
          </div>
        )}

        {step === AppStep.DEFINE_SCENES && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Identify Scene Breaks</h2>
              <p className="text-sm text-slate-400">Click the spaces between lines to define start points for new visuals.</p>
            </div>

            <div className="space-y-1 bg-slate-900/30 p-8 rounded-3xl border border-slate-800/50 shadow-inner">
              {lines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <button 
                      onClick={() => toggleMarker(idx)}
                      className={`w-full group relative py-2 transition-all flex items-center justify-center`}
                    >
                      <div className={`h-[2px] transition-all ${sceneMarkers.includes(idx) ? 'w-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-1/4 bg-slate-800 group-hover:w-full group-hover:bg-slate-700'}`}></div>
                      {sceneMarkers.includes(idx) && (
                        <div className="absolute bg-blue-500 text-[8px] font-black text-white px-2 py-0.5 rounded uppercase tracking-tighter">New Scene</div>
                      )}
                    </button>
                  )}
                  <div className={`text-center py-1 font-serif text-slate-300 transition-colors ${sceneMarkers.includes(idx) ? 'pt-4 text-white font-semibold' : ''}`}>
                    {line}
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="mt-10 flex gap-4">
              <button
                onClick={() => setStep(AppStep.PASTE_LYRICS)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold transition-all"
              >
                Back
              </button>
              <button
                onClick={handleProceedToProduction}
                className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-xl shadow-blue-600/20 transition-all"
              >
                Generate Pre-Production Draft
              </button>
            </div>
          </div>
        )}

        {step === AppStep.PRODUCTION && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">Director's Board</h2>
                <p className="text-slate-400 text-sm">
                  Angle: <span className="text-blue-400 italic">"{narrativeSeed || 'Standard Cinematic'}"</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isBulkProcessing && (
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest animate-pulse mr-4">
                    <i className="fa-solid fa-spinner animate-spin"></i>
                    Drafting Script...
                  </div>
                )}
                <button 
                  onClick={saveProject}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 transition-all"
                >
                  <i className="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {segments.map((seg, idx) => (
                <StoryboardCard 
                  key={seg.id} 
                  segment={seg} 
                  onUpdate={(updated) => updateSegment(idx, updated)}
                />
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-slate-800 flex justify-center gap-6">
               <button onClick={saveProject} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold flex items-center gap-2 transition-all">
                  <i className="fa-solid fa-download"></i> Download Bundle
               </button>
               <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                  <i className="fa-solid fa-play"></i> Production Mode
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
