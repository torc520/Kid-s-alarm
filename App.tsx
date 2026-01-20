
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Timeline, TimelineHandle } from './components/Timeline';
import { Palette } from './components/Palette';
import { TrashBin } from './components/TrashBin';
import { EditModal } from './components/EditModal';
import { Alarm, DayOfWeek, PaletteNote } from './types';
import { COLORS, INITIAL_PALETTE, ICON_MAP } from './constants';
import { Bell, BellOff, Music } from 'lucide-react';

// Web Audio API 上下文，确保单例
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

  // --- 闹钟响铃逻辑 ---
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const timerRef = useRef<number | null>(null);

  // 播放声音 (模拟电子闹钟声)
  const playAlarmSound = useCallback(() => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      
      // 如果已经在响，先停止
      if (oscillator) {
        try { oscillator.stop(); } catch(e) {}
        oscillator = null;
      }

      oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.5); // A5

      // 模拟“滴-滴-滴”的音量包络
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

  // 闹钟检测循环
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();
      const dayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const currentDayStr = dayMap[now.getDay()];

      // 只有在秒数为 0 时触发，避免一分钟内重复触发
      if (currentSeconds !== 0) return;

      // 查找符合条件的闹钟
      const found = alarms.find(alarm => {
        // 1. 时间匹配
        if (alarm.time !== currentMinutes) return false;
        
        // 2. 日期匹配
        if (alarm.repeatDays.length === 0) {
           return true; 
        } else {
           // @ts-ignore
           return alarm.repeatDays.includes(currentDayStr);
        }
      });

      if (found && !ringingAlarm) {
        setRingingAlarm(found);
        
        // 循环播放声音
        const loopSound = () => {
             playAlarmSound();
        };
        loopSound();
        // 设置一个定时器每秒响一次，模拟持续铃声
        const soundInterval = setInterval(loopSound, 1000);
        // 将 timer ID 存起来以便停止时清除，这里简单处理挂在 window 上或 ref
        (window as any)._alarmSoundInterval = soundInterval;
      }
    };

    // 每秒检查一次
    const intervalId = setInterval(checkAlarms, 1000);
    return () => clearInterval(intervalId);
  }, [alarms, ringingAlarm, playAlarmSound]);

  const handleStopRinging = () => {
    setRingingAlarm(null);
    stopAlarmSound();
    if ((window as any)._alarmSoundInterval) {
      clearInterval((window as any)._alarmSoundInterval);
    }
  };

  // --- End 闹钟逻辑 ---

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
    const newAlarm: Alarm = { id: newId, time, text: label, color, repeatDays: [], ringtone: '默认铃声', icon, isNew: true };
    setAlarms(prev => [...prev, newAlarm]);
  }, []);

  const handleUpdateAlarm = useCallback((updated: Alarm) => {
    setAlarms(prev => prev.map(a => a.id === updated.id ? updated : a));
  }, []);

  const handleMoveAlarm = useCallback((id: string, newTime: number) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, time: newTime } : a));
  }, []);

  const handleDeleteAlarm = useCallback((id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
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
        // Drop 时启用吸附
        const minutes = timelineRef.current.calculateMinutesFromY(clientY);
        handleAddAlarm(minutes, note.color, note.label, note.icon);
      }
    }
  };

  // 格式化时间辅助函数
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

      {/* 响铃弹窗 */}
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
                {ringingAlarm.text || "闹钟响了！"}
              </div>
            </div>

            <button 
              onClick={handleStopRinging}
              className="w-full py-4 bg-white text-black font-black text-lg rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <BellOff size={24} />
              停止闹铃
            </button>
          </div>
          <div className="mt-8 text-white/50 text-sm">
            点击按钮停止声音
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
