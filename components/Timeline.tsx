
import React, { useRef, useState, useLayoutEffect } from 'react';
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
}

export const Timeline: React.FC<TimelineProps> = ({
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
  setActiveMenuId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState<number | null>(null);
  const [movingAlarmId, setMovingAlarmId] = useState<string | null>(null);
  const [lastZoomTargetMinutes, setLastZoomTargetMinutes] = useState<number | null>(null);

  // 手势缩放相关
  const initialPinchDistance = useRef<number | null>(null);

  const hourHeight = zoomLevel === 1 ? TIMELINE_HEIGHT_BASE : TIMELINE_HEIGHT_ZOOMED;
  const totalHeight = 24 * hourHeight;
  const axisPositionPercent = 7; // 减小比例，使轴线更贴左

  useLayoutEffect(() => {
    if (lastZoomTargetMinutes !== null && containerRef.current) {
      const targetY = (lastZoomTargetMinutes / 1440) * totalHeight;
      const viewportHeight = containerRef.current.clientHeight;
      containerRef.current.scrollTop = targetY - viewportHeight / 2 + 50;
      setLastZoomTargetMinutes(null);
    }
  }, [zoomLevel, totalHeight]);

  const calculateMinutesFromY = (clientY: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = clientY - rect.top;
    const minutes = ((relativeY - 50) / totalHeight) * 1440;
    const snapInterval = zoomLevel === 1 ? 15 : 1;
    return Math.max(0, Math.min(1440, Math.round(minutes / snapInterval) * snapInterval));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const snappedMinutes = calculateMinutesFromY(e.clientY);
    setIsHovering(snappedMinutes);
    if (movingAlarmId) onMoveAlarm(movingAlarmId, snappedMinutes);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropMinutes = calculateMinutesFromY(e.clientY);
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

  // --- 手势缩放处理 ---
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
        // 放大
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setLastZoomTargetMinutes(calculateMinutesFromY(midY));
        setZoomLevel(2);
        initialPinchDistance.current = currentDist; // 重置以防连续触发
      } else if (ratio < 0.75 && zoomLevel === 2) {
        // 缩小
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setLastZoomTargetMinutes(calculateMinutesFromY(midY));
        setZoomLevel(1);
        initialPinchDistance.current = currentDist;
      }
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistance.current = null;
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
        setLastZoomTargetMinutes(calculateMinutesFromY(e.clientY));
        onTimelineDoubleClick();
      }}
      onClick={() => setActiveMenuId(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={() => setIsHovering(null)}
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
          <div key={i} className="absolute left-0 w-full flex items-center" style={{ top: `${i * hourHeight + 50}px`, transform: 'translateY(-50%)' }}>
            <span className="text-[10px] font-bold text-gray-400 text-right pr-2" style={{ width: `${axisPositionPercent}%` }}>{i.toString().padStart(2, '0')}</span>
            <div className={`rounded-full z-10 ${zoomLevel === 1 ? 'w-1.5 h-1.5 bg-gray-300' : 'w-2.5 h-2.5 bg-gray-400'}`} />
            <div className="flex-1 border-t border-gray-200 border-dashed ml-2 opacity-40" />
          </div>
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
              {(Math.floor(isHovering/60)).toString().padStart(2,'0')}:{(isHovering%60).toString().padStart(2,'0')}
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
          />
        )))}
      </div>
    </div>
  );
};
