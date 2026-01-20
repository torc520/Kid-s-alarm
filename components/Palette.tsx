
import React, { useState, useEffect } from 'react';
import { PaletteNote } from '../types';
import { ICON_MAP } from '../constants';
import { X } from 'lucide-react';

interface PaletteProps {
  isExpanded: boolean;
  notes: PaletteNote[];
  onDragStart: (note: { color: string; label: string; icon?: string }) => void;
  onAddNote: (color: string, label: string, index: number, icon?: string) => void;
  isDeleteMode: boolean;
  onDeleteNote: (index: number) => void;
}

export const Palette: React.FC<PaletteProps> = ({ 
  isExpanded, 
  notes, 
  onDragStart, 
  onAddNote, 
  isDeleteMode, 
  onDeleteNote 
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [lastNotesCount, setLastNotesCount] = useState(notes.length);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    if (lastNotesCount === 0 && notes.length > 0) {
      setIsRestored(true);
      const timer = setTimeout(() => setIsRestored(false), 1000);
      return () => clearTimeout(timer);
    }
    setLastNotesCount(notes.length);
  }, [notes.length]);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const isTopHalf = relY < rect.height / 2;
    setDragOverIndex(isTopHalf ? index : index + 1);
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverIndex === null) {
      setDragOverIndex(notes.length);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const dropTargetIndex = dragOverIndex !== null ? dragOverIndex : index;
    const alarmData = e.dataTransfer.getData('alarm-to-palette');
    if (alarmData) {
      const { color, text, icon } = JSON.parse(alarmData);
      onAddNote(color, text || '', dropTargetIndex, icon);
    }
    setDragOverIndex(null);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDragOverIndex(null);
    }
  };

  const GAP_SIZE = 56; 

  return (
    <div 
      className={`fixed top-0 bottom-0 right-0 transition-all duration-700 ease-in-out z-40 h-screen ${
        isExpanded ? 'translate-x-0' : 'translate-x-[calc(100%-40px)]'
      }`}
    >
      <div 
        className={`w-32 h-full bg-white/10 backdrop-blur-2xl border-l border-white/20 shadow-2xl transition-opacity flex flex-col relative ${isExpanded ? 'opacity-100' : 'opacity-90'}`}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, notes.length)}
      >
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/30 via-white/10 to-transparent z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white/30 via-white/10 to-transparent z-10 pointer-events-none" />

        <div className="flex-1 overflow-y-auto no-scrollbar px-3 flex flex-col justify-center items-center">
          <div className="w-full flex flex-col items-center py-32 space-y-4 relative">
            {notes.map((note, idx) => {
              let displacement = 0;
              if (dragOverIndex !== null) {
                displacement = idx < dragOverIndex ? -(GAP_SIZE / 2) : (GAP_SIZE / 2);
              }

              const IconComp = note.icon ? ICON_MAP[note.icon] : null;
              const entranceClass = isRestored ? 'animate-pop-in opacity-0' : 'opacity-100';

              return (
                <div 
                  key={`${idx}-${note.color}-${note.label}`}
                  className={`w-full shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${entranceClass}`}
                  style={{ 
                    transform: `translateY(${displacement}px)`,
                    animationDelay: isRestored ? `${idx * 0.06}s` : '0s'
                  }}
                >
                  <div
                    draggable={!isDeleteMode}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      const data = { color: note.color, label: note.label, icon: note.icon, paletteIndex: idx };
                      e.dataTransfer.setData('alarm-note', JSON.stringify(data));
                      onDragStart(data);
                    }}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => {
                      if (isDeleteMode) onDeleteNote(idx);
                    }}
                    className={`group relative h-11 w-full rounded-xl transition-all duration-300 shadow-lg flex items-center justify-start border border-white/20 
                      ${isDeleteMode ? 'shake cursor-pointer' : 'cursor-grab active:cursor-grabbing hover:scale-105 hover:-translate-x-1'}
                    `}
                    style={{ backgroundColor: note.color }}
                  >
                    <div 
                      className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] transition-transform" 
                      style={{ borderRightColor: note.color }} 
                    />
                    
                    <div className="w-full px-3 overflow-hidden text-left flex items-center gap-1.5">
                      {IconComp && (
                        <div className="text-black/30 shrink-0">
                          <IconComp size={14} strokeWidth={2.5} />
                        </div>
                      )}
                      {note.label ? (
                        <span className="text-[11px] font-black text-black/40 whitespace-nowrap select-none pointer-events-none block truncate">
                          {note.label}
                        </span>
                      ) : !IconComp ? (
                        <div className="w-2 h-2 rounded-full bg-black/10 mx-auto" />
                      ) : null}
                    </div>

                    {isDeleteMode && (
                      <div className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 text-white shadow-md border border-white z-10">
                        <X size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
