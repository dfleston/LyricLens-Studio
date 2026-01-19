
import React, { useState, useMemo, useRef } from 'react';
import { generateSceneContent } from './services/geminiService';
import { AppStep, StoryboardSegment, StoryboardProject, Character } from './types';
import StoryboardCard from './components/StoryboardCard';
import PresentationView from './components/PresentationView';
import CharacterManager from './components/CharacterManager';

const App: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [narrativeSeed, setNarrativeSeed] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [step, setStep] = useState<AppStep>(AppStep.PASTE_LYRICS);
  const [sceneMarkers, setSceneMarkers] = useState<number[]>([]);
  const [segments, setSegments] = useState<StoryboardSegment[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => rawText.split('\n').map(l => l.trim()).filter(l => l), [rawText]);

  const toggleMarker = (index: number) => {
    setSceneMarkers(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
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
          characters: []
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
        characters: []
      });
    }

    setSegments(newSegments);

    const populated = await Promise.all(newSegments.map(async (seg) => {
      try {
        const aiData = await generateSceneContent(seg.lyrics, "Musical Video Storyboard", narrativeSeed, characters);
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

  const extractCharactersFromText = (text: string) => {
    return (characters || [])
      .filter(char => {
        const regex = new RegExp(`\\b${char.name}\\b`, 'i');
        return regex.test(text);
      })
      .map(char => char.name);
  };

  const saveProject = () => {
    // Before saving, update segments with detected characters to ensure the package is accurate
    const updatedSegments = segments.map(seg => ({
      ...seg,
      characters: extractCharactersFromText(seg.visuals + ' ' + seg.cameraWork + ' ' + seg.lightingMood)
    }));

    const project: StoryboardProject = {
      rawText,
      narrativeSeed,
      sceneMarkers,
      segments: updatedSegments,
      characters: characters || [],
      step,
      version: "1.3.0"
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard-package-${Date.now()}.json`;
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
        setRawText(project.rawText || '');
        setNarrativeSeed(project.narrativeSeed || '');
        setSceneMarkers(project.sceneMarkers || []);
        setSegments(project.segments || []);
        setCharacters(project.characters || []);
        setStep(project.step === AppStep.PRESENTATION ? AppStep.PRODUCTION : project.step || AppStep.PASTE_LYRICS);
      } catch (err) {
        alert("Failed to load project file. Invalid format.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {step === AppStep.PRESENTATION && (
        <PresentationView 
          segments={segments}
          characters={characters}
          currentIndex={currentSceneIndex}
          onUpdateSegment={updateSegment}
          onNext={() => setCurrentSceneIndex(p => Math.min(segments.length - 1, p + 1))}
          onPrev={() => setCurrentSceneIndex(p => Math.max(0, p - 1))}
          onExit={() => setStep(AppStep.PRODUCTION)}
          narrativeSeed={narrativeSeed}
        />
      )}

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
              {[AppStep.PASTE_LYRICS, AppStep.DEFINE_SCENES, AppStep.PRODUCTION, AppStep.RESOURCES].map((s, idx) => (
                <React.Fragment key={s}>
                  <div 
                    className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors ${step === s ? 'text-blue-500 border-b-2 border-blue-500 pb-0.5' : 'text-slate-600'}`}
                    onClick={() => setStep(s)}
                  >
                    {s.replace('_', ' ')}
                  </div>
                  {idx < 3 && <div className="w-4 h-[1px] bg-slate-800"></div>}
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
              <button onClick={handleLoadClick} className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold"><i className="fa-solid fa-folder-open"></i> Load</button>
              <button onClick={saveProject} className="p-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 text-xs font-bold"><i className="fa-solid fa-floppy-disk"></i> Save Project</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {step === AppStep.PASTE_LYRICS && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight text-center">Directing Desk</h2>
              <p className="text-slate-400 text-center">Set the stage, define your cast, and paste your source text.</p>
            </div>
            <div className="space-y-10">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block px-1">Narrative Seed / Angle</label>
                <input
                  type="text"
                  value={narrativeSeed}
                  onChange={(e) => setNarrativeSeed(e.target.value)}
                  placeholder="e.g. A dystopian future with neon lighting..."
                  className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-2xl focus:ring-1 focus:ring-blue-500/50 outline-none text-sm text-white"
                />
              </div>

              <CharacterManager characters={characters || []} onUpdate={setCharacters} />

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block px-1">Lyrics / Script</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste lyrics or narrative text here..."
                  className="w-full h-80 p-6 bg-slate-900/50 border border-slate-800 rounded-3xl focus:ring-1 focus:ring-blue-500/50 outline-none text-lg resize-none font-serif text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(AppStep.DEFINE_SCENES)}
                disabled={!rawText.trim()}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-bold shadow-xl transition-all"
              >
                Proceed to Scene Layout
              </button>
            </div>
          </div>
        )}

        {step === AppStep.DEFINE_SCENES && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 text-center">Identify Scene Breaks</h2>
              <p className="text-sm text-slate-400 text-center">Click the spaces between lines to define start points for new visuals.</p>
            </div>
            <div className="space-y-1 bg-slate-900/30 p-8 rounded-3xl border border-slate-800/50">
              {lines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <button onClick={() => toggleMarker(idx)} className="w-full py-2 flex items-center justify-center group relative">
                      <div className={`h-[2px] transition-all ${sceneMarkers.includes(idx) ? 'w-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-1/4 bg-slate-800 group-hover:w-full group-hover:bg-slate-700'}`}></div>
                    </button>
                  )}
                  <div className={`text-center py-1 font-serif text-slate-300 ${sceneMarkers.includes(idx) ? 'pt-4 text-white font-semibold' : ''}`}>{line}</div>
                </React.Fragment>
              ))}
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => setStep(AppStep.PASTE_LYRICS)} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold">Back</button>
              <button onClick={handleProceedToProduction} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold">Generate Pre-Production Draft</button>
            </div>
          </div>
        )}

        {step === AppStep.PRODUCTION && (
          <div className="animate-in fade-in duration-700">
            {isCharModalOpen && (
              <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl space-y-6">
                  <div className="flex justify-between items-center"><h3 className="text-xl font-bold text-white">Edit Production Cast</h3><button onClick={() => setIsCharModalOpen(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button></div>
                  <CharacterManager characters={characters} onUpdate={setCharacters} />
                  <div className="pt-4 flex justify-end"><button onClick={() => setIsCharModalOpen(false)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Apply Changes</button></div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-bold text-white mb-1">Director's Board</h2>
                <div className="flex gap-4">
                  <button onClick={() => setIsCharModalOpen(true)} className="text-[10px] text-blue-500 hover:underline">Edit Cast</button>
                  <button onClick={saveProject} className="text-[10px] text-slate-500 hover:text-white transition-colors"><i className="fa-solid fa-cloud-arrow-up mr-1"></i> Stage Save</button>
                </div>
              </div>
              <button onClick={() => setStep(AppStep.RESOURCES)} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20">Finalize Resources <i className="fa-solid fa-arrow-right ml-2"></i></button>
            </div>
            <div className="space-y-4">
              {segments.map((seg, idx) => (
                <StoryboardCard key={seg.id} segment={seg} characters={characters} onUpdate={(updated) => updateSegment(idx, updated)} />
              ))}
            </div>
          </div>
        )}

        {step === AppStep.RESOURCES && (
          <div className="animate-in fade-in duration-700 max-w-4xl mx-auto">
             <div className="text-center mb-12">
               <h2 className="text-3xl font-bold text-white mb-2">Resource Gallery</h2>
               <p className="text-slate-400">Upload or refine character visual references for the final production package.</p>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
               {characters.map(char => (
                 <div key={char.id} className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center gap-6 group hover:border-blue-500/50 transition-all">
                    <div className="w-full aspect-square rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden relative group/img cursor-pointer">
                       {char.imageUrl ? (
                         <>
                           <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-500" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center transition-opacity">
                              <i className="fa-solid fa-camera-rotate text-2xl text-white mb-2"></i>
                              <span className="text-[10px] text-white font-bold uppercase tracking-widest">Update Reference</span>
                           </div>
                         </>
                       ) : (
                         <div className="flex flex-col items-center justify-center text-slate-700 group-hover/img:text-blue-500 transition-colors">
                           <i className="fa-solid fa-user-plus text-5xl mb-4"></i>
                           <p className="text-[10px] font-bold uppercase tracking-widest">Add Reference</p>
                         </div>
                       )}
                       <input 
                         type="file" 
                         accept="image/*"
                         className="absolute inset-0 opacity-0 cursor-pointer"
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onload = (ev) => setCharacters(prev => prev.map(c => c.id === char.id ? {...c, imageUrl: ev.target?.result as string} : c));
                             reader.readAsDataURL(file);
                           }
                         }}
                       />
                    </div>
                    <div className="text-center w-full">
                       <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{char.name}</h3>
                       <div className="h-0.5 w-12 bg-blue-600/30 mx-auto rounded-full mb-3"></div>
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">ID: {char.id.split('-')[1]}</p>
                    </div>
                 </div>
               ))}
               {characters.length === 0 && (
                 <div className="col-span-full text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
                   <p className="text-slate-500 italic">No characters defined. Return to Directing Desk to add cast.</p>
                   <button onClick={() => setStep(AppStep.PASTE_LYRICS)} className="mt-4 text-blue-500 text-sm hover:underline">Add Characters</button>
                 </div>
               )}
             </div>

             <div className="mt-16 flex flex-col items-center gap-8">
                <div className="flex justify-center gap-6 w-full">
                  <button onClick={() => setStep(AppStep.PRODUCTION)} className="px-8 py-4 bg-slate-800 text-slate-300 rounded-2xl font-bold flex items-center gap-3 transition-colors hover:bg-slate-700"><i className="fa-solid fa-chevron-left"></i> Storyboard</button>
                  <button onClick={saveProject} className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-bold flex items-center gap-3 shadow-xl transition-all hover:bg-slate-100 hover:scale-[1.02]"><i className="fa-solid fa-cube"></i> Bounce Full Package</button>
                  <button onClick={() => { setCurrentSceneIndex(0); setStep(AppStep.PRESENTATION); }} className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-blue-600/20 transition-all hover:bg-blue-500 hover:scale-[1.02]"><i className="fa-solid fa-play"></i> Start Presentation</button>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] font-bold">End of Pre-Production</p>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
