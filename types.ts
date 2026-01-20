
export enum DayOfWeek {
  Mon = '周一',
  Tue = '周二',
  Wed = '周三',
  Thu = '周四',
  Fri = '周五',
  Sat = '周六',
  Sun = '周日'
}

export interface Alarm {
  id: string;
  time: number; // minutes from start of day (0 to 1440)
  text: string;
  color: string;
  repeatDays: DayOfWeek[];
  ringtone: string;
  icon?: string; // Icon name from lucide or emoji
  dateRange?: { start: string; end: string };
  isNew?: boolean;
}

export interface PaletteNote {
  color: string;
  label: string;
  icon?: string;
}
