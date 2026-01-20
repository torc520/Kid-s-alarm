
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Timeline } from './components/Timeline';
import { Palette } from './components/Palette';
import { TrashBin } from './components/TrashBin';
import { EditModal } from './components/EditModal';
import { Alarm, DayOfWeek, PaletteNote } from './types';
import { COLORS, INITIAL_PALETTE } from './constants';

const App: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [paletteNotes, setPaletteNotes] = useState<PaletteNote[]>(INITIAL_PALETTE);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [draggingNote, setDraggingNote] = useState<{ color: string; label: string; icon?: string } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedAlarms = localStorage.getItem('fastdrag_alarms');
    if (savedAlarms) setAlarms(JSON.parse(savedAlarms));
    const savedPalette = localStorage.getItem('fastdrag_palette');
    if (savedPalette) setPaletteNotes(JSON.parse(savedPalette));
  }, []);

  useEffect(() => { localStorage.setItem('fastdrag_alarms', JSON.stringify(alarms)); }, [alarms]);
  useEffect(() => { localStorage.setItem('fastdrag_palette', JSON.stringify(paletteNotes)); }, [paletteNotes]);

  const handleAddAlarm = (time: number, color: string, label: string, icon?: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newAlarm: Alarm = { id: newId, time, text: label, color, repeatDays: [], ringtone: '默认铃声', icon, isNew: true };
    setAlarms(prev => [...prev, newAlarm]);
  };

  const handleUpdateAlarm = (updated: Alarm) => {
    setAlarms(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  const handleMoveAlarm = (id: string, newTime: number) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, time: newTime } : a));
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  const handleAddToPalette = (color: string, label: string, index: number, icon?: string) => {
    setPaletteNotes(prev => {
      const newList = [...prev];
      newList.splice(index, 0, { color, label, icon });
      return newList;
    });
  };

  const handleDeletePaletteNote = (index: number) => {
    setPaletteNotes(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // 如果删除后为空，则自动重置初始化恢复默认标签
      if (filtered.length === 0) {
        return INITIAL_PALETTE;
      }
      return filtered;
    });
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-sky-50 overflow-hidden select-none">
      <div className="flex-1 flex overflow-hidden relative">
        <Timeline 
          alarms={alarms}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
          isLandscape={isLandscape}
          onTimelineDoubleClick={() => setZoomLevel(prev => prev === 1 ? 2 : 1)}
          onAddAlarm={handleAddAlarm}
          onUpdateAlarm={handleUpdateAlarm}
          onMoveAlarm={handleMoveAlarm}
          isDeleteMode={isDeleteMode}
          onDeleteAlarm={handleDeleteAlarm}
          onEditAlarm={(alarm) => { setActiveMenuId(null); setEditingAlarm(alarm); }}
          setDraggingNote={setDraggingNote}
          activeMenuId={activeMenuId}
          setActiveMenuId={setActiveMenuId}
        />
        <Palette 
          isExpanded={isLandscape}
          notes={paletteNotes}
          onDragStart={(note) => setDraggingNote(note)}
          onAddNote={handleAddToPalette}
          isDeleteMode={isDeleteMode}
          onDeleteNote={handleDeletePaletteNote}
        />
      </div>
      <TrashBin isDeleteMode={isDeleteMode} isLandscape={isLandscape} onToggleDeleteMode={() => setIsDeleteMode(!isDeleteMode)} onDeletePaletteNote={handleDeletePaletteNote} onDeleteAlarm={handleDeleteAlarm} />
      {editingAlarm && <EditModal alarm={editingAlarm} onClose={() => setEditingAlarm(null)} onSave={(u) => { handleUpdateAlarm(u); setEditingAlarm(null); }} />}
    </div>
  );
};

export default App;
