
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Timeline, TimelineHandle } from './components/Timeline';
import { Palette } from './components/Palette';
import { TrashBin } from './components/TrashBin';
import { EditModal } from './components/EditModal';
import { Alarm, DayOfWeek, PaletteNote } from './types';
import { COLORS, INITIAL_PALETTE, ICON_MAP } from './constants';
import { Bell, BellOff, Music } from 'lucide-react';

// Web Audio API Singleton
let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;

const App: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [paletteNotes, setPaletteNotes] = useState<PaletteNote[]>(INITIAL_PALETTE);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [draggingNote, setDraggingNote] = useState<{ color: string; label: string; icon?: string } | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [is12HourMode, setIs12HourMode] = useState(true);
  const timelineRef = useRef<TimelineHandle>(null);

  // --- Ringing Logic ---
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const timerRef = useRef<number | null>(null);

  // Play Sound (Simulated Electronic Alarm)
  const playAlarmSound = useCallback(() => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // Stop if already playing
      if (oscillator) {
        try { oscillator.stop(); } catch(e) {}
        oscillator = null;
      }

      oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.5); // A5

      // "Beep-Beep-Beep" Envelope
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime + 0.4);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();
    } catch (e) {
      console.error("Audio play failed", e);
    }
  }, []);

  const stopAlarmSound = useCallback(() => {
    if (oscillator) {
      try { oscillator.stop(); } catch (e) {}
      oscillator = null;
    }
  }, []);

  // Alarm Check Loop
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();
      const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDayStr = dayMap[now.getDay()];

      // Only trigger at 0 seconds
      if (currentSeconds !== 0) return;

      // Find matching alarms
      const found = alarms.find(alarm => {
        // 1. Time match
        if (alarm.time !== currentMinutes) return false;
        
        // 2. Day match
        if (alarm.repeatDays.length === 0) {
           return true; 
        } else {
           // @ts-ignore
           return alarm.repeatDays.includes(currentDayStr);
        }
      });

      if (found && !ringingAlarm) {
        setRingingAlarm(found);
        
        // Loop sound
        const loopSound = () => {
             playAlarmSound();
        };
        loopSound();
        // Set interval to repeat sound every second
        const soundInterval = setInterval(loopSound, 1000);
        // Store timer ID to clear later
        (window as any)._alarmSoundInterval = soundInterval;
      }
    };

    // Check every second
    const intervalId = setInterval(checkAlarms, 1000);
    return () => clearInterval(intervalId);
  }, [alarms, ringingAlarm, playAlarmSound]);

  const handleDeleteAlarm = useCallback((id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  }, []);

  const handleStopRinging = () => {
    // Logic: Auto delete if single-use (no repeat days)
    if (ringingAlarm && ringingAlarm.repeatDays.length === 0) {
      handleDeleteAlarm(ringingAlarm.id);
    }

    setRingingAlarm(null);
    stopAlarmSound();
    if ((window as any)._alarmSoundInterval) {
      clearInterval((window as any)._alarmSoundInterval);
    }
  };

  // --- End Ringing Logic ---

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

  const handleAddAlarm = useCallback((time: number, color: string, label: string, icon?: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newAlarm: Alarm = { id: newId, time, text: label, color, repeatDays: [], ringtone: 'Default', icon, isNew: true };
    setAlarms(prev => [...prev, newAlarm]);
  }, []);

  const handleUpdateAlarm = useCallback((updated: Alarm) => {
    setAlarms(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  const handleMoveAlarm = useCallback((id: string, newTime: number) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, time: newTime } : a));
  }, []);

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
      if (filtered.length === 0) {
        return INITIAL_PALETTE;
      }
      return filtered;
    });
  };

  const handlePaletteDrop = (clientX: number, clientY: number, note: { color: string; label: string; icon?: string }) => {
    const screenWidth = window.innerWidth;
    const paletteWidth = isLandscape ? 128 : 0; 
    
    if (clientX < screenWidth - paletteWidth) {
      if (timelineRef.current) {
        // Enable snap on drop
        const minutes = timelineRef.current.calculateMinutesFromY(clientY);
        handleAddAlarm(minutes, note.color, note.label, note.icon);
      }
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const mStr = m.toString().padStart(2, '0');
    if (!is12HourMode) return `${h.toString().padStart(2, '0')}:${mStr}`;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mStr} ${suffix}`;
  };

  return (
    <div className="relative h-screen w-full flex flex-col bg-sky-50 overflow-hidden select-none">
      <div className="flex-1 flex overflow-hidden relative">
        <Timeline 
          ref={timelineRef}
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
          is12HourMode={is12HourMode}
          setIs12HourMode={setIs12HourMode}
        />
        <Palette 
          isExpanded={isLandscape}
          notes={paletteNotes}
          onDragStart={(note) => setDraggingNote(note)}
          onCustomDragEnd={handlePaletteDrop}
          onAddNote={handleAddToPalette}
          isDeleteMode={isDeleteMode}
          onDeleteNote={handleDeletePaletteNote}
        />
      </div>
      <TrashBin isDeleteMode={isDeleteMode} isLandscape={isLandscape} onToggleDeleteMode={() => setIsDeleteMode(!isDeleteMode)} onDeletePaletteNote={handleDeletePaletteNote} onDeleteAlarm={handleDeleteAlarm} />
      {editingAlarm && <EditModal alarm={editingAlarm} onClose={() => setEditingAlarm(null)} onSave={(u) => { handleUpdateAlarm(u); setEditingAlarm(null); }} />}

      {/* Ringing Modal */}
      {ringingAlarm && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div 
            className="w-[90%] max-w-sm rounded-[40px] p-8 flex flex-col items-center gap-6 shadow-[0_0_100px_rgba(255,255,255,0.3)] animate-bounce-slow"
            style={{ backgroundColor: ringingAlarm.color }}
          >
            <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center animate-ping-slow">
              {ringingAlarm.icon && ICON_MAP[ringingAlarm.icon] ? (
                 React.createElement(ICON_MAP[ringingAlarm.icon], { size: 48, className: "text-white" })
              ) : (
                 <Bell size={48} className="text-white" />
              )}
            </div>
            
            <div className="text-center">
              <div className="text-6xl font-black text-black/80 tracking-tighter mb-2">
                {formatTime(ringingAlarm.time).split(' ')[0]}
                <span className="text-2xl ml-1">{formatTime(ringingAlarm.time).split(' ')[1]}</span>
              </div>
              <div className="text-xl font-bold text-black/60">
                {ringingAlarm.text || "Alarm!"}
              </div>
            </div>

            <button 
              onClick={handleStopRinging}
              className="w-full py-4 bg-white text-black font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <BellOff size={24} />
              Stop
            </button>
          </div>
          <div className="mt-8 text-white/50 text-sm">
            Tap button to stop
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
