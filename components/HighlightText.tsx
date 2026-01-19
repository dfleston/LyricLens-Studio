
import React from 'react';
import { Character } from '../types';

interface HighlightTextProps {
  text: string;
  characters: Character[];
  className?: string;
}

const HighlightText: React.FC<HighlightTextProps> = ({ text, characters, className }) => {
  if (!text) return null;
  if (!characters || characters.length === 0) return <span className={className}>{text}</span>;

  // Create a regex to find character names (case insensitive, whole words)
  const names = characters.map(c => c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(\\b${names}\\b)`, 'gi');
  
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const isMatch = characters.some(c => c.name.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <strong key={i} className="text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.3)]">
            {part}
          </strong>
        ) : (
          part
        );
      })}
    </span>
  );
};

export default HighlightText;
