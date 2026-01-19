
import React, { useState, useRef } from 'react';
import { Character } from '../types';

interface CharacterManagerProps {
  characters: Character[];
  onUpdate: (chars: Character[]) => void;
}

const CharacterManager: React.FC<CharacterManagerProps> = ({ characters = [], onUpdate }) => {
  const [newName, setNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);

  const handleAddCharacter = () => {
    if (!newName.trim()) return;
    const char: Character = {
      id: `char-${Date.now()}`,
      name: newName.trim(),
      images: []
    };
    onUpdate([...characters, char]);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCharacter();
    }
  };

  const removeCharacter = (id: string) => {
    onUpdate(characters.filter(c => c.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0 || !activeCharId) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        onUpdate(characters.map(c => 
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

  const triggerUpload = (id: string) => {
    setActiveCharId(id);
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block px-1">
          Cast & Characters
        </label>
        <span className="text-[10px] text-slate-600 italic">Add names then upload reference images</span>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type character name and press Enter..."
          className="flex-1 p-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:ring-1 focus:ring-blue-500/50 outline-none text-sm transition-all text-white"
        />
        <button 
          type="button"
          onClick={handleAddCharacter}
          className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
        >
          <i className="fa-solid fa-plus"></i>
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        {(characters || []).map((char) => (
          <div 
            key={char.id}
            className="group relative flex items-center gap-3 bg-slate-800/40 border border-slate-700/50 p-2 pr-4 rounded-2xl hover:border-blue-500/30 transition-all"
          >
            <div 
              onClick={() => triggerUpload(char.id)}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors group/img"
            >
              {char.images && char.images.length > 0 ? (
                <img src={char.images[0]} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <i className="fa-solid fa-user-plus text-slate-600 group-hover/img:text-blue-500"></i>
              )}
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-200">{char.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-blue-400 uppercase font-bold">{(char.images || []).length} Refs</span>
                <button 
                  type="button"
                  onClick={() => removeCharacter(char.id)}
                  className="text-[10px] text-slate-500 hover:text-red-400 text-left transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {(!characters || characters.length === 0) && (
          <div className="text-xs text-slate-600 italic py-2">No characters defined yet.</div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        multiple
        className="hidden" 
      />
    </div>
  );
};

export default CharacterManager;
