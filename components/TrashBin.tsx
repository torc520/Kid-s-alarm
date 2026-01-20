
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface TrashBinProps {
  isDeleteMode: boolean;
  isLandscape: boolean;
  onToggleDeleteMode: () => void;
  onDeletePaletteNote: (index: number) => void;
  onDeleteAlarm: (id: string) => void;
}

export const TrashBin: React.FC<TrashBinProps> = ({ 
  isDeleteMode, 
  isLandscape, 
  onToggleDeleteMode,
  onDeletePaletteNote,
  onDeleteAlarm
}) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX <= rect.left ||
      e.clientX >= rect.right ||
      e.clientY <= rect.top ||
      e.clientY >= rect.bottom
    ) {
      setIsOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    // 1. 处理调色盘便签的删除
    const noteDataStr = e.dataTransfer.getData('alarm-note');
    if (noteDataStr) {
      try {
        const noteData = JSON.parse(noteDataStr);
        if (typeof noteData.paletteIndex === 'number') {
          onDeletePaletteNote(noteData.paletteIndex);
        }
      } catch (err) {
        console.error("Failed to parse palette note data for deletion", err);
      }
    }

    // 2. 处理时间轴已有闹钟的删除
    const moveDataStr = e.dataTransfer.getData('alarm-move');
    if (moveDataStr) {
      try {
        const moveData = JSON.parse(moveDataStr);
        if (moveData.id) {
          onDeleteAlarm(moveData.id);
        }
      } catch (err) {
        console.error("Failed to parse alarm move data for deletion", err);
      }
    }
  };

  return (
    <div 
      className={`fixed top-6 z-50 flex flex-col items-center gap-2 transition-all duration-500 ${
        isLandscape ? 'right-40' : 'right-20'
      }`}
    >
      <button 
        onClick={onToggleDeleteMode}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isDeleteMode ? 'bg-red-500 scale-110' : (isOver ? 'bg-red-400 scale-110' : 'bg-gray-200 hover:bg-gray-300')
        }`}
      >
        <Trash2 
          size={32} 
          className={`transition-colors pointer-events-none ${isDeleteMode || isOver ? 'text-white' : 'text-gray-500'}`} 
        />
      </button>
    </div>
  );
};
