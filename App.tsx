
import React, { useState, useMemo, useRef } from 'react';
import { generateSceneContent, generateFrame } from './services/geminiService';
import { AppStep, StoryboardSegment, StoryboardProject, Character } from './types';
import StoryboardCard from './components/StoryboardCard';
import CharacterManager from './components/CharacterManager';

const App: React.FC = () => {
  const [rawText, setRawText] = useState('');
  const [narrativeSeed, setNarrativeSeed] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [step, setStep] = useState<AppStep>(AppStep.PASTE_LYRICS);
  const [sceneMarkers, setSceneMarkers] = useState<number[]>([]);
  const [segments, setSegments] = useState<StoryboardSegment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);

  const lines = useMemo(() => rawText.split('\n').map(l => l.trim()).filter(l => l), [rawText]);

  const toggleMarker = (index: number) => {
    setSceneMarkers(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleCreateDrafts = async () => {
    setErrorMessage(null);
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
    setStep(AppStep.RESOURCES);
  };

  const handleGoToProduction = async () => {
    setStep(AppStep.PRODUCTION);
    if (segments.some(s => !s.visuals)) {
      try {
        const populated = await Promise.all(segments.map(async (seg) => {
          if (seg.visuals) return seg;
          try {
            const aiData = await generateSceneContent(seg.lyrics, "Musical Video Storyboard", narrativeSeed, characters);
            return { ...seg, ...aiData };
          } catch (e) { return seg; }
        }));
        setSegments(populated);
      } catch (e) { console.error(e); }
    }
  };

  const handleProcessVisuals = async (sceneId: string) => {
    setActiveSceneId(sceneId);
    setErrorMessage(null);
    setStep(AppStep.FRAME_DEV);
    setIsGeneratingFrames(true);

    const segment = segments.find(s => s.id === sceneId);
    if (!segment) return;

    try {
      const [first, last] = await Promise.all([
        generateFrame(segment, characters, 'FIRST', narrativeSeed),
        generateFrame(segment, characters, 'LAST', narrativeSeed)
      ]);

      setSegments(prev => prev.map(s => 
        s.id === sceneId ? { ...s, firstFrame: first, lastFrame: last } : s
      ));
    } catch (err: any) {
      setErrorMessage(err.message.includes('QUOTA') ? "Limit reached. Wait a moment." : "Generation failed.");
    } finally {
      setIsGeneratingFrames(false);
    }
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
      characters,
      step,
      version: "2.1.0"
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard-bundle-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => fileInputRef.current?.click();

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
        // Force transition to production tab upon load as requested
        setStep(AppStep.PRODUCTION);
      } catch (err) { alert("Invalid project file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !activeCharId) return;
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCharacters(prev => prev.map(c => 
          c.id === activeCharId ? { ...c, images: [...(c.images || []), dataUrl].slice(0, 5) } : c
        ));
      };
      reader.readAsDataURL(file);
    });
    setActiveCharId(null);
    e.target.value = '';
  };

  const handlePrint = () => {
    window.print();
  };

  const activeSegment = segments.find(s => s.id === activeSceneId);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      {/* GLOBAL PRINT LAYOUT - FORCING BLACK TEXT ON WHITE BG */}
      <div className="print-only text-black bg-white">
        <div className="border-b-4 border-black pb-8 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-6xl font-black uppercase tracking-tighter text-black">Production <span className="text-blue-600">Bundle</span></h1>
            <p className="text-lg font-bold text-gray-400 mt-2 uppercase tracking-widest">Master Storyboard • {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
             <p className="text-sm font-black uppercase text-black">LyricLens AI Suite</p>
             <p className="text-xs text-gray-400">Reference: {narrativeSeed || 'Untitled'}</p>
          </div>
        </div>
        {segments.map((seg, idx) => (
          <div key={seg.id} className="storyboard-strip">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-black text-white flex items-center justify-center font-black text-2xl rounded-lg">{idx + 1}</div>
              <h2 className="text-3xl font-black uppercase tracking-tight text-black">{seg.sectionTitle}</h2>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="aspect-video bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                {seg.firstFrame && <img src={seg.firstFrame} className="w-full h-full object-cover" alt="Start Frame" />}
              </div>
              <div className="aspect-video bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                {seg.lastFrame && <img src={seg.lastFrame} className="w-full h-full object-cover" alt="Peak Frame" />}
              </div>
            </div>
            <div className="grid grid-cols-12 gap-10">
              <div className="col-span-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1">Script Context</h4>
                <p className="text-sm font-serif italic text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">"{seg.lyrics}"</p>
              </div>
              <div className="col-span-8 space-y-4">
                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Visual Action</h4>
                   <p className="text-sm font-bold text-gray-900">{seg.visuals}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Camera</h4>
                    <p className="text-xs text-gray-600">{seg.cameraWork}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Atmosphere</h4>
                    <p className="text-xs text-gray-600">{seg.lightingMood}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-md border-b border-white/5 no-print px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30 cursor-pointer" onClick={() => setStep(AppStep.PASTE_LYRICS)}>
            <i className="fa-solid fa-clapperboard text-white text-xs"></i>
          </div>
          <h1 className="text-md font-black tracking-tighter uppercase italic">LyricLens <span className="text-blue-500">Studio</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4 mr-4">
            {[AppStep.PASTE_LYRICS, AppStep.DEFINE_SCENES, AppStep.RESOURCES, AppStep.PRODUCTION].map((s) => (
              <div key={s} className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer ${step === s ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : 'text-slate-600'}`} onClick={() => setStep(s)}>{s.replace('_', ' ')}</div>
            ))}
          </div>
          <input type="file" ref={fileInputRef} onChange={loadProject} accept=".json" className="hidden" />
          <button onClick={handleLoadClick} title="Load Project Bundle" className="p-2 text-slate-400 hover:text-white transition-colors text-[10px] font-bold uppercase"><i className="fa-solid fa-folder-open"></i></button>
          <button onClick={saveProject} title="Save Project Bundle" className="p-2 text-blue-400 hover:text-white transition-colors text-[10px] font-bold uppercase"><i className="fa-solid fa-floppy-disk"></i></button>
        </div>
      </header>

      {errorMessage && (
        <div className="fixed top-14 left-0 right-0 z-[60] bg-red-600 p-2 text-center no-print">
           <p className="text-[10px] font-black text-white uppercase tracking-widest">{errorMessage}</p>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 no-print">
        {step === AppStep.PASTE_LYRICS && (
          <div className="max-w-2xl mx-auto py-12 animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Director's <span className="text-blue-500">Input</span></h2>
              <p className="text-slate-400 font-medium">Define your narrative core and production seed.</p>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aesthetic Seed</label>
                <input type="text" value={narrativeSeed} onChange={(e) => setNarrativeSeed(e.target.value)} placeholder="e.g. Gritty 35mm film noir, neon highlights..." className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl focus:ring-1 focus:ring-blue-500/50 outline-none text-sm text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lyrics / Story Script</label>
                <textarea value={rawText} onChange={(e) => setRawText(e.target.value)} placeholder="Paste your song text here..." className="w-full h-80 p-8 bg-slate-900 border border-white/5 rounded-3xl focus:ring-1 focus:ring-blue-500/50 outline-none text-xl font-serif text-white resize-none shadow-inner" />
              </div>
              <button onClick={() => setStep(AppStep.DEFINE_SCENES)} disabled={!rawText.trim()} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Next: Define Breaks <i className="fa-solid fa-arrow-right ml-2"></i></button>
            </div>
          </div>
        )}

        {step === AppStep.DEFINE_SCENES && (
          <div className="max-w-xl mx-auto py-12 animate-in fade-in duration-500">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-black text-white mb-2 uppercase">Scene <span className="text-blue-500">Pacing</span></h2>
              <p className="text-sm text-slate-400">Click between lines to create scene breaks.</p>
            </div>
            <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-1">
              {lines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <button onClick={() => toggleMarker(idx)} className="w-full py-2 group relative">
                      <div className={`h-[2px] transition-all ${sceneMarkers.includes(idx) ? 'w-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'w-1/6 bg-white/5 group-hover:w-full group-hover:bg-slate-700'}`}></div>
                    </button>
                  )}
                  <div className={`text-center py-2 font-serif transition-all ${sceneMarkers.includes(idx) ? 'text-white font-black text-lg' : 'text-slate-400 text-sm'}`}>{line}</div>
                </React.Fragment>
              ))}
            </div>
            <div className="mt-10 flex gap-4">
              <button onClick={() => setStep(AppStep.PASTE_LYRICS)} className="flex-1 py-4 bg-white/5 rounded-2xl font-bold uppercase tracking-widest">Back</button>
              <button onClick={handleCreateDrafts} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest">Next: Moodboard</button>
            </div>
          </div>
        )}

        {step === AppStep.RESOURCES && (
          <div className="max-w-4xl mx-auto py-8 animate-in fade-in duration-500">
            <div className="text-center mb-12">
               <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Visual <span className="text-blue-500">Anchors</span></h2>
               <p className="text-slate-400 font-medium">Define your cast and upload references for AI continuity.</p>
            </div>
            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl mb-12">
               <CharacterManager characters={characters} onUpdate={setCharacters} />
            </div>
            <div className="flex justify-center gap-6">
               <button onClick={() => setStep(AppStep.DEFINE_SCENES)} className="px-10 py-4 bg-white/5 rounded-2xl font-bold uppercase tracking-widest">Back</button>
               <button onClick={handleGoToProduction} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20">Enter Production <i className="fa-solid fa-film ml-2"></i></button>
            </div>
          </div>
        )}

        {step === AppStep.PRODUCTION && (
          <div className="animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
              <div>
                <h2 className="text-5xl font-black text-white tracking-tighter uppercase">Director's <span className="text-blue-500">Board</span></h2>
                <div className="flex gap-6 mt-4">
                  <button onClick={() => setStep(AppStep.RESOURCES)} className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 transition-colors hover:text-blue-400"><i className="fa-solid fa-users"></i> Edit Cast</button>
                  <button onClick={handlePrint} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 transition-colors hover:text-emerald-400"><i className="fa-solid fa-file-pdf"></i> PDF Storyboard</button>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              {segments.map((seg, idx) => (
                <StoryboardCard key={seg.id} segment={seg} characters={characters} onUpdate={(updated) => updateSegment(idx, updated)} onProcess={() => handleProcessVisuals(seg.id)} />
              ))}
            </div>
          </div>
        )}

        {step === AppStep.FRAME_DEV && activeSegment && (
          <div className="animate-in fade-in duration-500 max-w-5xl mx-auto py-12 space-y-12">
             <div className="bg-slate-900/80 p-8 rounded-[3rem] border border-white/10 flex justify-between items-center shadow-2xl backdrop-blur-md">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{activeSegment.sectionTitle}</h2>
                  <p className="text-xl text-slate-400 italic font-serif">"{activeSegment.lyrics}"</p>
                </div>
                <button onClick={() => setStep(AppStep.PRODUCTION)} className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"><i className="fa-solid fa-check mr-2"></i> Accept Visuals</button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-4"><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Start Shot</span>{isGeneratingFrames && <i className="fa-solid fa-circle-notch animate-spin text-blue-500"></i>}</div>
                   <div className="aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/5 relative shadow-2xl">
                      {activeSegment.firstFrame ? <img src={activeSegment.firstFrame} className="w-full h-full object-cover animate-in fade-in duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse uppercase font-black tracking-widest">Rendering...</div>}
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex justify-between items-center px-4"><span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Peak Motion</span>{isGeneratingFrames && <i className="fa-solid fa-circle-notch animate-spin text-indigo-500"></i>}</div>
                   <div className="aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/5 relative shadow-2xl">
                      {activeSegment.lastFrame ? <img src={activeSegment.lastFrame} className="w-full h-full object-cover animate-in fade-in duration-1000" /> : <div className="w-full h-full flex items-center justify-center text-slate-700 animate-pulse uppercase font-black tracking-widest">Rendering...</div>}
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
    </div>
  );
};

export default App;
