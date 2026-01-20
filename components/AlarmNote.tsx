
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Alarm, DayOfWeek } from '../types';
import { TIMELINE_HEIGHT_BASE, TIMELINE_HEIGHT_ZOOMED, RINGTONES, COLORS, ICON_MAP, ICON_LIST } from '../constants';
import { Music, X, Clock, Palette as PaletteIcon, Smile } from 'lucide-react';

interface AlarmNoteProps {
  alarm: Alarm;
  indexInGroup: number;
  zoomLevel: number;
  isLandscape: boolean;
  isDeleteMode: boolean;
  onDelete: () => void;
  onUpdate: (alarm: Alarm) => void;
  axisPositionPercent: number;
  isActive: boolean;
  onToggleMenu: (id: string | null) => void;
  onDragStarted?: () => void;
  onDragEnded?: () => void;
  topOffset?: number;
  is12HourMode: boolean;
}

const UI_DAYS = [
  { label: '一', value: DayOfWeek.Mon },
  { label: '二', value: DayOfWeek.Tue },
  { label: '三', value: DayOfWeek.Wed },
  { label: '四', value: DayOfWeek.Thu },
  { label: '五', value: DayOfWeek.Fri },
  { label: '六', value: DayOfWeek.Sat },
  { label: '日', value: DayOfWeek.Sun }
];

export const AlarmNote: React.FC<AlarmNoteProps> = React.memo(({
  alarm,
  indexInGroup,
  zoomLevel,
  isLandscape,
  isDeleteMode,
  onDelete,
  onUpdate,
  axisPositionPercent,
  isActive,
  onToggleMenu,
  onDragStarted,
  onDragEnded,
  topOffset = 0,
  is12HourMode
}) => {
  const [showRingtones, setShowRingtones] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showIcons, setShowIcons] = useState(true); 
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 日期滑动选择状态
  const [isSwipingDays, setIsSwipingDays] = useState(false);
  const [swipeMode, setSwipeMode] = useState<'add' | 'remove' | null>(null);
  const swipedDaysRef = useRef<Set<DayOfWeek>>(new Set());

  // 颜色滑动选择状态
  const [isSwipingColors, setIsSwipingColors] = useState(false);

  useEffect(() => {
    if (isActive) {
      setTimeout(() => inputRef.current?.focus(), 400);
    } else {
      setShowRingtones(false); setShowColors(false); setShowIcons(true);
    }
  }, [isActive]);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsSwipingDays(false);
      setIsSwipingColors(false);
      setSwipeMode(null);
      swipedDaysRef.current.clear();
    };
    if (isSwipingDays || isSwipingColors) {
      window.addEventListener('pointerup', handleGlobalPointerUp);
    }
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isSwipingDays, isSwipingColors]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const mStr = m.toString().padStart(2, '0');
    if (!is12HourMode) {
      return `${h.toString().padStart(2, '0')}:${mStr}`;
    }
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mStr} ${suffix}`;
  };

  const toggleDay = (day: DayOfWeek, forceMode?: 'add' | 'remove') => {
    const isIncluded = alarm.repeatDays.includes(day);
    const mode = forceMode || (isIncluded ? 'remove' : 'add');
    
    let nextDays = [...alarm.repeatDays];
    if (mode === 'add' && !isIncluded) {
      nextDays.push(day);
    } else if (mode === 'remove' && isIncluded) {
      nextDays = nextDays.filter(d => d !== day);
    }
    
    // 始终按照周一到周日的顺序排列
    const orderMap = UI_DAYS.reduce((acc, dayObj, idx) => {
      acc[dayObj.value] = idx;
      return acc;
    }, {} as Record<DayOfWeek, number>);

    nextDays.sort((a, b) => orderMap[a] - orderMap[b]);
    
    const isChanged = nextDays.length !== alarm.repeatDays.length || 
                      !nextDays.every((d, i) => d === alarm.repeatDays[i]);

    if (isChanged) {
        onUpdate({ ...alarm, repeatDays: nextDays });
    }
    return mode;
  };

  const handleDayPointerDown = (e: React.PointerEvent, day: DayOfWeek) => {
    e.preventDefault();
    const mode = toggleDay(day);
    setIsSwipingDays(true);
    setSwipeMode(mode);
    swipedDaysRef.current.add(day);
  };

  const handleDayPointerEnter = (day: DayOfWeek) => {
    if (isSwipingDays && swipeMode && !swipedDaysRef.current.has(day)) {
      toggleDay(day, swipeMode);
      swipedDaysRef.current.add(day);
    }
  };

  // 颜色选择处理
  const handleColorPointerDown = (e: React.PointerEvent, color: string) => {
    e.preventDefault();
    onUpdate({ ...alarm, color });
    setIsSwipingColors(true);
  };

  const handleColorPointerEnter = (color: string) => {
    if (isSwipingColors) {
      onUpdate({ ...alarm, color });
    }
  };

  const hourHeight = zoomLevel === 1 ? TIMELINE_HEIGHT_BASE : TIMELINE_HEIGHT_ZOOMED;
  const topPos = (alarm.time / 1440) * 24 * hourHeight + topOffset;

  const renderAlarmContent = (isFloating = false) => {
    const Icon = alarm.icon ? ICON_MAP[alarm.icon] : null;
    return (
      <div 
        className={`relative px-4 py-2 rounded-2xl flex flex-col justify-center border transition-all duration-300 backdrop-blur-[4px] 
          ${isFloating ? 'ring-[6px] ring-white shadow-[0_45px_120px_rgba(0,0,0,0.5)] scale-110' : 'shadow-lg border-black/5'}
        `}
        style={{ 
          backgroundColor: alarm.color,
          minHeight: alarm.text ? '58px' : '38px',
          width: isFloating ? 'auto' : '100%',
          minWidth: isFloating ? '220px' : '0',
          opacity: !isFloating && isActive ? 0.3 : 1 
        }}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 overflow-hidden">
            {Icon && <Icon size={16} strokeWidth={3} className="text-black/60 shrink-0" />}
            <div className="bg-black/15 px-2 py-0.5 rounded-md text-[10px] font-black text-black/70 flex items-center gap-1 shrink-0">
              <Clock size={11} strokeWidth={3} />
              {formatTime(alarm.time)}
            </div>
            <span className="text-[9px] font-bold text-black/40 whitespace-nowrap overflow-hidden tracking-tight truncate">
              {alarm.repeatDays.length === 0 ? '单次闹钟' : (alarm.repeatDays.length === 7 ? '每天重复' : alarm.repeatDays.join(' '))}
            </span>
          </div>
          {alarm.text && (
            <div className="flex flex-col items-center px-1">
              <div className={`font-black text-gray-900 leading-tight text-center break-words ${isFloating ? 'text-[15px]' : 'text-[11px]'}`}>
                {alarm.text}
              </div>
            </div>
          )}
        </div>
        {!isFloating && isDeleteMode && (
          <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-lg border-2 border-white z-10"><X size={10} strokeWidth={3} /></div>
        )}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[9px]" style={{ borderRightColor: alarm.color }} />
      </div>
    );
  };

  const renderActiveLayer = () => {
    if (!isActive || isDeleteMode) return null;

    // 偏移量：Smile 17, Colors 59, Music 101
    const caretOffset = showIcons ? 17 : (showColors ? 59 : 101);

    return createPortal(
      <div className={`fixed inset-0 z-[6000] flex p-8 pointer-events-none transition-all duration-300
        ${isLandscape ? 'flex-row items-center justify-center gap-12' : 'flex-col items-center justify-between'}`}
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[10px] pointer-events-auto" onClick={() => onToggleMenu(null)} />
        
        {/* 预览区域 */}
        <div className={`relative flex justify-center z-[6010] 
          ${isLandscape ? 'w-[40%] animate-in slide-in-from-left-12' : 'mt-[15vh] w-full animate-in slide-in-from-top-12'} 
          duration-500`}
        >
          {renderAlarmContent(true)}
        </div>

        {/* 控制面板 */}
        <div 
          className={`relative bg-white/70 backdrop-blur-3xl rounded-[40px] shadow-[0_60px_150px_rgba(0,0,0,0.5)] border border-white/80 p-5 pointer-events-auto animate-in duration-500 z-[6010]
            ${isLandscape ? 'w-[450px] max-h-[90vh] overflow-y-auto no-scrollbar slide-in-from-right-12' : 'w-[350px] mb-[4vh] slide-in-from-bottom-12'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 重复日期选择 */}
          <div className="flex justify-between gap-1 mb-5 touch-none select-none">
            {UI_DAYS.map((day) => {
              const act = alarm.repeatDays.includes(day.value);
              return (
                <button
                  key={day.label}
                  onPointerDown={(e) => handleDayPointerDown(e, day.value)}
                  onPointerEnter={() => handleDayPointerEnter(day.value)}
                  className={`flex-1 py-3 text-[13px] font-black rounded-xl transition-all duration-200 ${
                    act ? 'bg-sky-500 text-white shadow-lg scale-105' : 'bg-white/80 text-gray-400 hover:bg-white'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          {/* 功能按钮与输入框 */}
          <div className="flex items-center gap-2 mb-2 relative">
            <div className="flex gap-1 shrink-0 relative z-30">
              {[
                { i: Smile, s: showIcons, set: setShowIcons },
                { i: PaletteIcon, s: showColors, set: setShowColors },
                { i: Music, s: showRingtones, set: setShowRingtones }
              ].map((btn, idx) => (
                <button 
                  key={idx}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${btn.s ? 'bg-sky-500 text-white scale-105 shadow-md shadow-sky-200' : 'bg-white/80 text-gray-400 hover:bg-white'}`}
                  onClick={() => { setShowIcons(false); setShowColors(false); setShowRingtones(false); btn.set(true); }}
                >
                  <btn.i size={18} strokeWidth={btn.s ? 3 : 2} />
                </button>
              ))}
            </div>

            <div className="flex-1 bg-white/90 rounded-xl border border-black/5 px-4 h-12 flex items-center shadow-inner focus-within:ring-2 focus-within:ring-sky-400 relative z-30">
              <input
                ref={inputRef}
                type="text"
                value={alarm.text}
                placeholder="在此输入闹钟备注..."
                onChange={(e) => onUpdate({ ...alarm, text: e.target.value })}
                className="w-full bg-transparent border-none focus:outline-none text-[14px] font-bold text-gray-800"
              />
            </div>
          </div>

          {/* 选择器容器 */}
          <div className="relative mt-2">
            <div 
              className="absolute -top-[12px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] border-b-black/5 transition-all duration-300 ease-out z-10"
              style={{ left: `${caretOffset}px`, transform: 'translateX(-50%)' }}
            />
            <div 
              className="absolute -top-[10px] w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[12px] border-b-gray-50/60 transition-all duration-300 ease-out z-20"
              style={{ left: `${caretOffset}px`, transform: 'translateX(-50%)' }}
            />

            <div className="bg-gray-50/60 rounded-3xl border border-black/5 p-4 h-[190px] overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.03)] backdrop-blur-sm relative z-25">
              {showIcons && (
                <div className="h-full overflow-y-auto no-scrollbar grid grid-cols-6 gap-2.5 animate-in fade-in zoom-in-95 duration-300">
                  {ICON_LIST.map(n => {
                    const I = ICON_MAP[n];
                    return (
                      <button 
                        key={n} 
                        onClick={() => {
                          onUpdate({ ...alarm, icon: n });
                          onToggleMenu(null);
                        }} 
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 ${alarm.icon === n ? 'bg-sky-500 text-white border-sky-200 scale-110 shadow-md ring-2 ring-white' : 'bg-white/80 text-gray-400 border-transparent hover:border-gray-200'}`}
                      >
                        <I size={20} strokeWidth={2.5} />
                      </button>
                    );
                  })}
                </div>
              )}
              {showColors && (
                <div className="h-full overflow-y-auto no-scrollbar flex flex-wrap gap-3 justify-center content-start animate-in fade-in zoom-in-95 duration-300 touch-none">
                  {Object.values(COLORS).map(c => (
                    <button 
                      key={c} 
                      onPointerDown={(e) => handleColorPointerDown(e, c)}
                      onPointerEnter={() => handleColorPointerEnter(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-all ${alarm.color === c ? 'border-sky-500 scale-110 shadow-md ring-2 ring-white' : 'border-transparent hover:scale-105'}`} 
                      style={{ backgroundColor: c }} 
                    />
                  ))}
                  <div className="w-full h-4" />
                </div>
              )}
              {showRingtones && (
                <div className="h-full overflow-y-auto no-scrollbar grid gap-1.5 animate-in fade-in slide-in-from-right-4 duration-300">
                  {RINGTONES.map(r => (
                    <button 
                      key={r.name} 
                      onClick={() => onUpdate({ ...alarm, ringtone: r.name })} 
                      className={`px-4 py-3 rounded-xl text-[12px] flex justify-between items-center transition-all ${
                        alarm.ringtone === r.name ? 'bg-sky-500 text-white font-black shadow-sm' : 'bg-white/80 text-gray-500 border border-transparent hover:border-gray-100'
                      }`}
                    >
                      <span>{r.name}</span>
                      <span className={`text-[10px] ${alarm.ringtone === r.name ? 'text-white/70' : 'text-gray-400'}`}>
                        {r.duration}
                      </span>
                    </button>
                  ))}
                  <div className="h-4" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div 
      draggable={!isActive}
      onDragStart={(e) => {
        if (isDeleteMode || isActive) { e.preventDefault(); return; }
        const img = new Image(); img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        e.dataTransfer.setDragImage(img, 0, 0);
        e.dataTransfer.setData('alarm-note', JSON.stringify({ color: alarm.color, label: alarm.text, icon: alarm.icon }));
        e.dataTransfer.setData('alarm-move', JSON.stringify({ id: alarm.id }));
        onDragStarted?.();
      }}
      onDragEnd={() => onDragEnded?.()}
      className={`absolute transition-all duration-300 ${isDeleteMode ? 'shake cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      style={{ 
        top: `${topPos}px`, 
        transform: `translateY(-50%) translateX(${indexInGroup * 20}px)`,
        zIndex: isActive ? 2000 : 20 + indexInGroup,
        left: `${axisPositionPercent + 1.5}%`,
        width: 'auto',
        maxWidth: isLandscape ? '30%' : '65%',
        minWidth: alarm.text ? (zoomLevel === 1 ? '160px' : '200px') : (zoomLevel === 1 ? '70px' : '90px'),
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isDeleteMode) onDelete();
        else onToggleMenu(isActive ? null : alarm.id);
      }}
    >
      {renderAlarmContent()}
      {renderActiveLayer()}
    </div>
  );
});
