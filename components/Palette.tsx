
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  onCustomDragEnd: (x: number, y: number, note: { color: string; label: string; icon?: string }) => void;
}

export const Palette: React.FC<PaletteProps> = ({ 
  isExpanded, 
  notes, 
  onDragStart, 
  onAddNote, 
  isDeleteMode, 
  onDeleteNote,
  onCustomDragEnd
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [lastNotesCount, setLastNotesCount] = useState(notes.length);
  const [isRestored, setIsRestored] = useState(false);

  // 自定义触摸拖拽状态
  const [activeTouchNote, setActiveTouchNote] = useState<{
    note: PaletteNote;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
  } | null>(null);

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

  // --- 自定义触摸处理逻辑 (即点即拖) ---

  const handleTouchStart = (e: React.TouchEvent, note: PaletteNote) => {
    // 如果是删除模式，不启用拖拽
    if (isDeleteMode) return;
    
    const touch = e.touches[0];
    setActiveTouchNote({
      note,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isDragging: false // 初始不视为拖拽，直到发生移动
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!activeTouchNote) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - activeTouchNote.startX;
    
    // 只有当向左拖动一定距离时，才认定为拖拽出 Palette，从而阻止 Palette 滚动
    if (!activeTouchNote.isDragging && deltaX < -10) {
      setActiveTouchNote(prev => prev ? ({ ...prev, isDragging: true }) : null);
    }

    if (activeTouchNote.isDragging) {
      // 阻止默认滚动行为
      if (e.cancelable) e.preventDefault(); 
      setActiveTouchNote(prev => prev ? ({ ...prev, currentX: touch.clientX, currentY: touch.clientY }) : null);
      onDragStart(activeTouchNote.note); // 通知父组件开始拖拽（可选，用于视觉反馈）
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (activeTouchNote && activeTouchNote.isDragging) {
      const touch = e.changedTouches[0];
      onCustomDragEnd(touch.clientX, touch.clientY, activeTouchNote.note);
    }
    setActiveTouchNote(null);
    onDragStart(null as any); // Reset drag state in parent
  };

  const GAP_SIZE = 56; 

  return (
    <>
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
                      // 绑定 Touch 事件来实现“即点即拖”
                      onTouchStart={(e) => handleTouchStart(e, note)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onClick={() => {
                        if (isDeleteMode) onDeleteNote(idx);
                      }}
                      className={`group relative h-11 w-full rounded-xl transition-all duration-300 shadow-lg flex items-center justify-start border border-white/20 
                        ${isDeleteMode ? 'shake cursor-pointer' : 'cursor-grab active:cursor-grabbing hover:scale-105 hover:-translate-x-1'}
                      `}
                      // 添加 touch-action: pan-y 允许垂直滚动，但在 handleTouchMove 中我们会手动阻止
                      style={{ backgroundColor: note.color, touchAction: 'pan-y' }} 
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

      {/* 拖拽时的幽灵元素 (仅在 Touch 模式下显示) */}
      {activeTouchNote && activeTouchNote.isDragging && createPortal(
        <div 
          className="fixed pointer-events-none z-[9999] opacity-90"
          style={{
            left: activeTouchNote.currentX,
            top: activeTouchNote.currentY,
            transform: 'translate(-50%, -50%) rotate(-5deg)'
          }}
        >
          <div 
            className="h-11 w-32 rounded-xl shadow-2xl flex items-center justify-start border border-white/40 ring-2 ring-white"
            style={{ backgroundColor: activeTouchNote.note.color }}
          >
            <div className="w-full px-3 overflow-hidden text-left flex items-center gap-1.5">
               {activeTouchNote.note.icon && ICON_MAP[activeTouchNote.note.icon] && (
                 React.createElement(ICON_MAP[activeTouchNote.note.icon], { size: 14, strokeWidth: 2.5, className: "text-black/30 shrink-0" })
               )}
               {activeTouchNote.note.label && (
                 <span className="text-[11px] font-black text-black/40 whitespace-nowrap block truncate">
                   {activeTouchNote.note.label}
                 </span>
               )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
