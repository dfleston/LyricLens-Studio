
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { generateSceneContent, generateFrame } from './services/geminiService';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [isGeneratingFrames, setIsGeneratingFrames] = useState(false);

  const lines = useMemo(() => rawText.split('\n').map(l => l.trim()).filter(l => l), [rawText]);

  const toggleMarker = (index: number) => {
    setSceneMarkers(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
  };

  const handleProceedToProduction = async () => {
    setIsBulkProcessing(true);
    setErrorMessage(null);
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

    try {
      const populated = await Promise.all(newSegments.map(async (seg) => {
        try {
          const aiData = await generateSceneContent(seg.lyrics, "Musical Video Storyboard", narrativeSeed, characters);
          return { ...seg, ...aiData };
        } catch (e: any) {
          if (e.message.includes('QUOTA')) {
            setErrorMessage("Some scenes couldn't be automatically populated due to API rate limits.");
          }
          return seg;
        }
      }));
      setSegments(populated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsBulkProcessing(false);
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
      console.error("Frame generation failed:", err);
      if (err.message.includes('QUOTA')) {
        setErrorMessage("Visual generation limit reached. Please wait a few seconds.");
      } else {
        setErrorMessage("Visual generation failed. Ensure your character photos are valid.");
      }
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

  const extractCharactersFromText = (text: string) => {
    return (characters || [])
      .filter(char => {
        const regex = new RegExp(`\\b${char.name}\\b`, 'i');
        return regex.test(text);
      })
      .map(char => char.name);
  };

  const saveProject = () => {
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
      version: "1.7.1"
    };
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard-codified-bundle-${Date.now()}.json`;
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
        setStep(AppStep.PRODUCTION);
      } catch (err) {
        alert("Failed to load project file.");
      }
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
          c.id === activeCharId 
            ? { ...c, images: [...(c.images || []), dataUrl].slice(0, 5) } 
            : c
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
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30">
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

      {/* HIDDEN PRINT LAYOUT - Global Target for PDF Engine */}
      <div className="print-only p-12 text-black bg-white">
        <div className="border-b-4 border-black pb-6 mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-6xl font-black uppercase tracking-tighter">Production <span className="text-blue-600">Bundle</span></h1>
            <p className="text-lg font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">Master Storyboard Document • {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-right">
             <p className="text-sm font-black uppercase">LyricLens AI Studio</p>
             <p className="text-xs text-gray-400">Project Reference: {narrativeSeed || 'Cinematic Production'}</p>
          </div>
        </div>
        
        <div className="space-y-16">
          {segments.map((seg, idx) => (
            <div key={seg.id} className="storyboard-strip">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-black text-white flex items-center justify-center font-black text-3xl rounded-xl">{idx + 1}</div>
                <h2 className="text-4xl font-black uppercase tracking-tight">{seg.sectionTitle}</h2>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="space-y-3">
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Shot A: Initial Sequence</p>
                   <div className="aspect-video bg-gray-50 border-2 border-gray-100 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-sm">
                    {seg.firstFrame ? (
                      <img src={seg.firstFrame} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-12">
                         <i className="fa-solid fa-image text-gray-200 text-5xl mb-4"></i>
                         <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Rendering Pending</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Shot B: Peak Motion Sequence</p>
                   <div className="aspect-video bg-gray-50 border-2 border-gray-100 rounded-[2rem] overflow-hidden flex items-center justify-center shadow-sm">
                    {seg.lastFrame ? (
                      <img src={seg.lastFrame} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-12">
                         <i className="fa-solid fa-image text-gray-200 text-5xl mb-4"></i>
                         <p className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Rendering Pending</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-12">
                <div className="col-span-4 space-y-6">
                  <div>
                    <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4 border-b-2 border-gray-100 pb-2">Narrative Seed</h4>
                    <p className="text-base font-serif italic text-gray-800 leading-relaxed bg-gray-50 p-6 rounded-2xl border border-gray-100">"{seg.lyrics}"</p>
                  </div>
                </div>
                <div className="col-span-8 space-y-8">
                  <div>
                     <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Action Description</h4>
                     <p className="text-base font-bold text-gray-950 leading-relaxed">{seg.visuals}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                    <div>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Camera Logic</h4>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium">{seg.cameraWork}</p>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3">Atmospheric Tone</h4>
                      <p className="text-sm text-gray-600 leading-relaxed font-medium">{seg.lightingMood}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-20 pt-12 border-t-4 border-black flex justify-between items-center text-[12px] font-black uppercase tracking-[0.4em] text-gray-400">
           <span>Production Bundle Export</span>
           <span>Generated via LyricLens AI Studio</span>
           <span>Total Production Segments: {segments.length}</span>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-md border-b border-white/5 no-print">
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 cursor-pointer hover:scale-105 transition-transform" onClick={() => setStep(AppStep.PASTE_LYRICS)}>
              <i className="fa-solid fa-clapperboard text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic">LyricLens <span className="text-blue-500">Studio</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-4">
              {[AppStep.PASTE_LYRICS, AppStep.DEFINE_SCENES, AppStep.PRODUCTION, AppStep.RESOURCES].map((s, idx) => (
                <React.Fragment key={s}>
                  <div 
                    className={`text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-colors ${step === s ? 'text-blue-500 border-b-2 border-blue-500 pb-1' : 'text-slate-600'}`}
                    onClick={() => setStep(s)}
                  >
                    {s.replace('_', ' ')}
                  </div>
                  {idx < 3 && <div className="w-4 h-[1px] bg-white/10"></div>}
                </React.Fragment>
              ))}
            </div>

            <input type="file" ref={fileInputRef} onChange={loadProject} accept=".json" className="hidden" />

            <div className="flex items-center gap-2 border-l border-white/10 pl-4">
              <button onClick={handleLoadClick} className="p-2 text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"><i className="fa-solid fa-folder-open"></i> Load</button>
              <button onClick={saveProject} title="Save project codified bundle (JSON including all assets)" className="p-2 text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"><i className="fa-solid fa-floppy-disk"></i> Save Bundle</button>
            </div>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="fixed top-16 left-0 right-0 z-[60] bg-red-600 border-b border-red-500 p-2 text-center animate-in slide-in-from-top duration-300 no-print">
           <p className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center justify-center gap-3">
             <i className="fa-solid fa-triangle-exclamation"></i> {errorMessage}
             <button onClick={() => setErrorMessage(null)} className="ml-4 bg-white/20 px-2 py-0.5 rounded hover:bg-white/30">Dismiss</button>
           </p>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8 no-print">
        {step === AppStep.PASTE_LYRICS && (
          <div className="animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto py-12">
            <div className="text-center mb-12">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mb-4">Phase 01: Setup</div>
              <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Directing <span className="text-blue-500">Desk</span></h2>
              <p className="text-slate-400 font-medium">Set the creative direction and define your cinematic cast.</p>
            </div>
            <div className="space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block px-1">Production Aesthetic Seed</label>
                <input
                  type="text"
                  value={narrativeSeed}
                  onChange={(e) => setNarrativeSeed(e.target.value)}
                  placeholder="e.g. Gritty cyberpunk noir with anamorphic flares..."
                  className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl focus:ring-1 focus:ring-blue-500/50 outline-none text-sm text-white placeholder:text-slate-700 transition-all shadow-inner"
                />
              </div>

              <CharacterManager characters={characters || []} onUpdate={setCharacters} />

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] block px-1">Lyrics / Storybeat Script</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your source text here..."
                  className="w-full h-80 p-8 bg-slate-900 border border-white/5 rounded-[2.5rem] focus:ring-1 focus:ring-blue-500/50 outline-none text-xl resize-none font-serif text-white shadow-inner leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(AppStep.DEFINE_SCENES)}
                disabled={!rawText.trim()}
                className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/20 transition-all hover:-translate-y-1 active:translate-y-0"
              >
                Proceed to Scene Layout <i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        )}

        {step === AppStep.DEFINE_SCENES && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto py-12">
            <div className="text-center mb-8">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mb-4">Phase 02: Pacing</div>
              <h2 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Identify Scene <span className="text-blue-500">Breaks</span></h2>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">Slice your script into visual segments. Click between lines to create markers.</p>
            </div>
            <div className="space-y-1 bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
              {lines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <button onClick={() => toggleMarker(idx)} className="w-full py-3 flex items-center justify-center group relative outline-none">
                      <div className={`h-[2px] transition-all duration-300 ${sceneMarkers.includes(idx) ? 'w-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'w-1/6 bg-white/5 group-hover:w-full group-hover:bg-slate-700'}`}></div>
                      <div className={`absolute text-[8px] font-bold uppercase tracking-widest transition-opacity duration-300 ${sceneMarkers.includes(idx) ? 'opacity-100 text-blue-400' : 'opacity-0 text-white/40'}`}>Break Point</div>
                    </button>
                  )}
                  <div className={`text-center py-2 font-serif text-slate-400 transition-all duration-500 ${sceneMarkers.includes(idx) ? 'pt-6 text-white font-black text-lg scale-105' : 'text-sm'}`}>{line}</div>
                </React.Fragment>
              ))}
            </div>
            <div className="mt-12 flex gap-4">
              <button onClick={() => setStep(AppStep.PASTE_LYRICS)} className="flex-1 py-4 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-2xl font-bold uppercase tracking-widest transition-all">Back</button>
              <button onClick={handleProceedToProduction} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02]">Generate Drafts</button>
            </div>
          </div>
        )}

        {step === AppStep.PRODUCTION && (
          <div className="animate-in fade-in duration-700">
            {isCharModalOpen && (
              <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 no-print">
                <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Edit Production <span className="text-blue-500">Cast</span></h3>
                    <button onClick={() => setIsCharModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <CharacterManager characters={characters} onUpdate={setCharacters} />
                  <div className="pt-6 flex justify-end">
                    <button onClick={() => setIsCharModalOpen(false)} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">Apply Changes</button>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Pre-Production Live</span>
                </div>
                <h2 className="text-5xl font-black text-white tracking-tighter uppercase">Director's <span className="text-blue-500">Board</span></h2>
                <div className="flex gap-6 mt-3">
                  <button onClick={() => setIsCharModalOpen(true)} className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-2 transition-colors"><i className="fa-solid fa-user-gear"></i> Manage Cast</button>
                  <button onClick={saveProject} title="Save project codified bundle (JSON including all assets)" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors"><i className="fa-solid fa-cloud-arrow-up"></i> Export Bundle</button>
                  <button onClick={handlePrint} className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest flex items-center gap-2 transition-colors"><i className="fa-solid fa-file-pdf"></i> PDF Storyboard</button>
                </div>
              </div>
              <button onClick={() => setStep(AppStep.RESOURCES)} className="group px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all hover:scale-105">
                Build Moodboards <i className="fa-solid fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
              </button>
            </div>
            <div className="space-y-6">
              {segments.map((seg, idx) => (
                <StoryboardCard 
                  key={seg.id} 
                  segment={seg} 
                  characters={characters} 
                  onUpdate={(updated) => updateSegment(idx, updated)} 
                  onProcess={() => handleProcessVisuals(seg.id)}
                />
              ))}
            </div>
          </div>
        )}

        {step === AppStep.RESOURCES && (
          <div className="animate-in fade-in duration-700 py-8">
             <div className="text-center mb-16">
               <div className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-[0.3em] mb-4">Phase 04: Visual Continuity</div>
               <h2 className="text-5xl font-black text-white mb-4 tracking-tighter uppercase">Resource <span className="text-blue-500">Gallery</span></h2>
               <p className="text-slate-400 font-medium max-w-lg mx-auto">Upload character references to anchor the AI's generation and maintain visual identity across the board.</p>
             </div>
             
             <div className="grid grid-cols-1 gap-12">
               {characters.map(char => (
                 <div key={char.id} className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 group shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                       <div className="text-center md:text-left">
                         <h3 className="text-3xl font-black text-white tracking-tighter uppercase">{char.name}</h3>
                         <p className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.5em] mt-1">Consistency Anchor</p>
                       </div>
                       <button 
                         onClick={() => {
                           setActiveCharId(char.id);
                           imageInputRef.current?.click();
                         }}
                         className="px-8 py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/5"
                       >
                         <i className="fa-solid fa-camera-retro mr-2"></i> Add Reference
                       </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                       {(char.images || []).map((img, i) => (
                         <div key={i} className="aspect-square rounded-[2rem] bg-black border border-white/5 overflow-hidden relative group/img shadow-xl">
                            <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                            <button 
                              onClick={() => setCharacters(prev => prev.map(c => c.id === char.id ? {...c, images: c.images.filter((_, idx) => idx !== i)} : c))}
                              className="absolute top-4 right-4 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-all hover:scale-110 shadow-lg"
                            >
                              <i className="fa-solid fa-trash-can text-[10px] text-white"></i>
                            </button>
                         </div>
                       ))}
                       {(!char.images || char.images.length === 0) && (
                         <div 
                           onClick={() => {
                             setActiveCharId(char.id);
                             imageInputRef.current?.click();
                           }}
                           className="aspect-square rounded-[2rem] border-2 border-dashed border-white/5 hover:border-blue-500/30 flex flex-col items-center justify-center text-slate-700 cursor-pointer transition-all hover:bg-blue-500/5 group/add"
                         >
                            <i className="fa-solid fa-images text-3xl mb-3 group-hover/add:text-blue-500 transition-colors"></i>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] group-hover/add:text-blue-400">Empty Profile</span>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
               {characters.length === 0 && (
                 <div className="text-center py-24 bg-slate-900/30 border border-white/5 rounded-[4rem] border-dashed">
                   <i className="fa-solid fa-users-slash text-6xl text-slate-800 mb-6"></i>
                   <p className="text-xl font-bold text-slate-600 italic">No characters detected in production roster.</p>
                 </div>
               )}
             </div>

             <div className="mt-20 flex justify-center gap-6">
                <button onClick={() => setStep(AppStep.PRODUCTION)} className="px-10 py-5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-3xl font-black uppercase tracking-widest transition-all">Board View</button>
                <button onClick={() => { setCurrentSceneIndex(0); setStep(AppStep.PRESENTATION); }} className="px-12 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-100">
                  Enter Cinema Mode <i className="fa-solid fa-film ml-3"></i>
                </button>
             </div>
          </div>
        )}

        {step === AppStep.FRAME_DEV && activeSegment && (
          <div className="animate-suite-in py-6 space-y-12 no-print">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-slate-900/80 p-8 rounded-[3rem] border border-white/10 shadow-2xl backdrop-blur-md">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="px-3 py-1 bg-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/30">Phase 05: Rendering</span>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase">{activeSegment.sectionTitle}</h2>
                  </div>
                  <p className="text-xl text-slate-300 italic font-serif leading-relaxed border-l-2 border-blue-500/50 pl-6 py-2">"{activeSegment.lyrics}"</p>
                </div>
                <button 
                  onClick={() => setStep(AppStep.PRODUCTION)}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 shadow-lg shadow-blue-500/20"
                >
                  <i className="fa-solid fa-check"></i> Accept Visuals
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                   <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">A: Starting Shot</span>
                      </div>
                      {isGeneratingFrames && <i className="fa-solid fa-circle-notch animate-spin text-blue-500 text-xs"></i>}
                   </div>
                   <div className="aspect-video bg-black border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.1)] group/frame relative ring-1 ring-white/5">
                      {activeSegment.firstFrame ? (
                        <div className="relative w-full h-full overflow-hidden">
                           <img src={activeSegment.firstFrame} className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                           <div className="absolute inset-0 bg-blue-500/5 pointer-events-none"></div>
                           <div className="absolute top-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-bold text-white uppercase tracking-widest">Master Shot - Initial</div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center space-y-6 p-12 bg-zinc-950">
                           <div className="relative">
                              <div className="w-20 h-20 border-t-2 border-r-2 border-blue-500/40 rounded-full animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <i className="fa-solid fa-palette text-blue-500/20 text-2xl"></i>
                              </div>
                           </div>
                           <div className="text-center space-y-2">
                             <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.3em] animate-pulse">Analyzing References</p>
                             <p className="text-[9px] text-slate-700 uppercase font-bold tracking-widest">Injecting Continuity Anchors...</p>
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex justify-between items-center px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">B: Peak Motion</span>
                      </div>
                      {isGeneratingFrames && <i className="fa-solid fa-circle-notch animate-spin text-slate-600 text-xs"></i>}
                   </div>
                   <div className="aspect-video bg-black border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.1)] group/frame relative ring-1 ring-white/5">
                      {activeSegment.lastFrame ? (
                        <div className="relative w-full h-full overflow-hidden">
                           <img src={activeSegment.lastFrame} className="w-full h-full object-cover animate-in fade-in zoom-in duration-1000" />
                           <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
                           <div className="absolute top-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-[8px] font-bold text-white uppercase tracking-widest">Motion Keyframe - Extrapolated</div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center space-y-6 p-12 bg-zinc-950">
                           <div className="relative">
                              <div className="w-20 h-20 border-t-2 border-l-2 border-indigo-500/40 rounded-full animate-spin direction-reverse"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                 <i className="fa-solid fa-wind text-indigo-500/20 text-2xl"></i>
                              </div>
                           </div>
                           <div className="text-center space-y-2">
                             <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em] animate-pulse">Calculating Motion</p>
                             <p className="text-[9px] text-slate-700 uppercase font-bold tracking-widest">Extrapolating Cinematic Depth...</p>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-10 bg-slate-950 border border-white/10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                   <div>
                      <div className="flex items-center gap-3 mb-4">
                         <i className="fa-solid fa-clapperboard text-blue-500 text-xs"></i>
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Visual Narrative</label>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{activeSegment.visuals}</p>
                   </div>
                   <div>
                      <div className="flex items-center gap-3 mb-4">
                         <i className="fa-solid fa-video text-indigo-500 text-xs"></i>
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Camera Dynamics</label>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{activeSegment.cameraWork}</p>
                   </div>
                   <div>
                      <div className="flex items-center gap-3 mb-4">
                         <i className="fa-solid fa-lightbulb text-amber-500 text-xs"></i>
                         <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Mood & Atmosphere</label>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{activeSegment.lightingMood}</p>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Separate hidden input for character image uploads */}
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        multiple
        className="hidden" 
      />

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #020617;
        }
        ::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
};

export default App;
