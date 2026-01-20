
import React, { useRef, useState, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';
import { Alarm } from '../types';
import { TIMELINE_HEIGHT_BASE, TIMELINE_HEIGHT_ZOOMED } from '../constants';
import { AlarmNote } from './AlarmNote';

interface TimelineProps {
  alarms: Alarm[];
  zoomLevel: number;
  setZoomLevel: (level: number) => void;
  isLandscape: boolean;
  onTimelineDoubleClick: () => void;
  onAddAlarm: (time: number, color: string, label: string, icon?: string) => void;
  onUpdateAlarm: (alarm: Alarm) => void;
  onMoveAlarm: (id: string, newTime: number) => void;
  isDeleteMode: boolean;
  onDeleteAlarm: (id: string) => void;
  onEditAlarm: (alarm: Alarm) => void;
  setDraggingNote: (note: { color: string; label: string; icon?: string } | null) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  is12HourMode: boolean;
  setIs12HourMode: (v: boolean) => void;
}

export interface TimelineHandle {
  calculateMinutesFromY: (clientY: number) => number;
}

export const Timeline = forwardRef<TimelineHandle, TimelineProps>(({
  alarms,
  zoomLevel,
  setZoomLevel,
  isLandscape,
  onTimelineDoubleClick,
  onAddAlarm,
  onUpdateAlarm,
  onMoveAlarm,
  isDeleteMode,
  onDeleteAlarm,
  onEditAlarm,
  setDraggingNote,
  activeMenuId,
  setActiveMenuId,
  is12HourMode,
  setIs12HourMode
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState<number | null>(null);
  const [movingAlarmId, setMovingAlarmId] = useState<string | null>(null);
  const [lastZoomTargetMinutes, setLastZoomTargetMinutes] = useState<number | null>(null);

  // 防抖动 RAF 引用
  const rafRef = useRef<number | null>(null);

  // 手势缩放相关
  const initialPinchDistance = useRef<number | null>(null);

  const hourHeight = zoomLevel === 1 ? TIMELINE_HEIGHT_BASE : TIMELINE_HEIGHT_ZOOMED;
  const totalHeight = 24 * hourHeight;
  const axisPositionPercent = 12;

  useLayoutEffect(() => {
    if (lastZoomTargetMinutes !== null && containerRef.current) {
      const targetY = (lastZoomTargetMinutes / 1440) * totalHeight;
      const viewportHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTop = targetY - viewportHeight / 2 + 50;
      setLastZoomTargetMinutes(null);
    }
  }, [zoomLevel, totalHeight]);

  const calculateMinutesFromY = (clientY: number, snapToGrid = true) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const minutes = ((relativeY - 50) / totalHeight) * 1440;
    
    if (zoomLevel === 1) {
       // 缩小模式：始终吸附 15 分钟
       if (snapToGrid) return Math.max(0, Math.min(1440, Math.round(minutes / 15) * 15));
       return Math.max(0, Math.min(1440, minutes));
    } else {
       // 放大模式：
       // 如果 snapToGrid 为 true (Drop 或外部调用)，吸附到整数分钟
       // 如果 snapToGrid 为 false (Drag 过程中)，不吸附，返回浮点数，实现平滑移动
       if (snapToGrid) {
         return Math.max(0, Math.min(1440, Math.round(minutes)));
       }
       return Math.max(0, Math.min(1440, minutes));
    }
  };

  useImperativeHandle(ref, () => ({
    calculateMinutesFromY: (y) => calculateMinutesFromY(y, true)
  }));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const clientY = e.clientY;

    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
        const shouldSnap = zoomLevel === 1;
        const minutes = calculateMinutesFromY(clientY, shouldSnap);
        
        setIsHovering(minutes);
        if (movingAlarmId) onMoveAlarm(movingAlarmId, minutes);
        
        rafRef.current = null;
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    // 关键修复：取消尚未执行的渲染帧，防止虚线重现
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const dropMinutes = calculateMinutesFromY(e.clientY, true);
    setIsHovering(null);

    if (movingAlarmId) {
      onMoveAlarm(movingAlarmId, dropMinutes);
      setMovingAlarmId(null);
      return;
    }

    const data = e.dataTransfer.getData('alarm-note');
    if (data) {
      try {
        const { color, label, icon } = JSON.parse(data);
        onAddAlarm(dropMinutes, color, label, icon);
      } catch (err) {
        console.error("Drop creation failed", err);
      }
    }
    setDraggingNote(null);
  };

  const handleDragLeave = () => {
    // 关键修复：取消尚未执行的渲染帧
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsHovering(null);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / initialPinchDistance.current;

      if (ratio > 1.25 && zoomLevel === 1) {
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setLastZoomTargetMinutes(calculateMinutesFromY(midY, false));
        setZoomLevel(2);
        initialPinchDistance.current = currentDist; 
      } else if (ratio < 0.75 && zoomLevel === 2) {
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setLastZoomTargetMinutes(calculateMinutesFromY(midY, false));
        setZoomLevel(1);
        initialPinchDistance.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
  };

  const formatHourLabel = (hour: number) => {
    if (!is12HourMode) return hour.toString().padStart(2, '0');
    const val = hour % 12;
    if (val === 0) {
      return hour === 12 ? '12' : '0';
    }
    return val.toString();
  };

  const formatPreviewTime = (minutes: number) => {
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

  const sortedAlarms = [...alarms].sort((a, b) => a.time - b.time);
  const groupedAlarms: Alarm[][] = [];
  sortedAlarms.forEach(alarm => {
    const group = groupedAlarms.find(g => g.some(ga => Math.abs(ga.time - alarm.time) < (zoomLevel === 1 ? 40 : 15)));
    if (group) group.push(alarm);
    else groupedAlarms.push([alarm]);
  });

  return (
    <div 
      ref={containerRef}
      className={`flex-1 h-full overflow-y-auto no-scrollbar bg-sky-100/30 py-4 pl-1 relative scroll-smooth touch-none ${isLandscape ? 'pr-48' : 'pr-12'}`}
      style={{ touchAction: 'pan-y pinch-zoom' }}
      onDoubleClick={(e) => {
        setLastZoomTargetMinutes(calculateMinutesFromY(e.clientY, false));
        onTimelineDoubleClick();
      }}
      onClick={() => setActiveMenuId(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        ref={timelineRef}
        className="relative w-full"
        style={{ height: `${totalHeight + 100}px`, paddingTop: '50px', paddingBottom: '50px' }}
      >
        <div className="absolute w-1 bg-gray-300 rounded-full" style={{ left: `${axisPositionPercent}%`, top: '50px', bottom: '50px' }} />
        
        {Array.from({ length: 25 }).map((_, i) => (
          <React.Fragment key={i}>
            <div className="absolute left-0 w-full flex items-center" style={{ top: `${i * hourHeight + 50}px`, transform: 'translateY(-50%)' }}>
              <div className="flex items-center justify-end pr-3 gap-1 relative" style={{ width: `${axisPositionPercent}%` }}>
                <span className={`font-bold transition-all duration-300 ${
                  i === 12 
                    ? 'text-sky-600 text-[14px]' 
                    : (i % 12 === 0 ? 'text-gray-500 text-[12px]' : 'text-gray-400 text-[12px]')
                }`}>
                  {formatHourLabel(i)}
                </span>
                
                {i === 12 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIs12HourMode(!is12HourMode);
                    }}
                    className="absolute -right-7 bg-sky-100 text-sky-600 text-[8px] font-black px-1 py-0.5 rounded border border-sky-200 hover:bg-sky-200 active:scale-95 transition-all"
                  >
                    {is12HourMode ? '24H' : 'PM'}
                  </button>
                )}
              </div>

              <div className={`rounded-full z-10 transition-all ${
                i === 12 ? 'w-2 h-2 bg-sky-500 ring-2 ring-sky-200' : (
                  zoomLevel === 1 ? 'w-1.5 h-1.5 bg-gray-300' : 'w-2 h-2 bg-gray-400'
                )
              }`} />
              
              <div className="flex-1 border-t border-gray-200 border-dashed ml-2 opacity-40" />
            </div>

            {zoomLevel > 1 && i < 24 && [10, 20, 30, 40, 50].map(min => (
              <div 
                key={`${i}-${min}`}
                className="absolute left-0 w-full flex items-center" 
                style={{ top: `${(i * hourHeight) + ((min / 60) * hourHeight) + 50}px`, transform: 'translateY(-50%)' }}
              >
                 <div className="flex justify-end pr-3" style={{ width: `${axisPositionPercent}%` }}>
                   <span className="text-[9px] text-gray-300 font-medium">{min}</span>
                 </div>
                 <div className="w-1 h-1 bg-gray-200 rounded-full z-10" />
                 <div className="flex-1 border-t border-gray-100 border-dashed ml-2 opacity-30" />
              </div>
            ))}
          </React.Fragment>
        ))}

        {isHovering !== null && !movingAlarmId && (
          <div 
            className="absolute h-14 rounded-2xl border-[3px] border-dashed border-sky-500 bg-sky-500/10 flex items-center px-6 transition-all pointer-events-none z-50 shadow-2xl animate-pulse"
            style={{ 
              top: `${(isHovering / 1440) * totalHeight + 50}px`, 
              transform: 'translateY(-50%)',
              left: `${axisPositionPercent + 1}%`,
              width: '50%', maxWidth: '280px'
            }}
          >
            <span className="text-xl font-black text-sky-600">
              {formatPreviewTime(isHovering)}
            </span>
          </div>
        )}

        {groupedAlarms.map((group) => group.map((alarm, index) => (
          <AlarmNote 
            key={alarm.id}
            alarm={alarm}
            indexInGroup={index}
            zoomLevel={zoomLevel}
            isLandscape={isLandscape}
            isDeleteMode={isDeleteMode}
            onDelete={() => onDeleteAlarm(alarm.id)}
            onUpdate={onUpdateAlarm}
            axisPositionPercent={axisPositionPercent}
            isActive={activeMenuId === alarm.id}
            onToggleMenu={setActiveMenuId}
            onDragStarted={() => setMovingAlarmId(alarm.id)}
            onDragEnded={() => setMovingAlarmId(null)}
            topOffset={50}
            is12HourMode={is12HourMode}
          />
        )))}
      </div>
    </div>
  );
});
