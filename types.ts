
export enum DayOfWeek {
  Mon = 'Mon',
  Tue = 'Tue',
  Wed = 'Wed',
  Thu = 'Thu',
  Fri = 'Fri',
  Sat = 'Sat',
  Sun = 'Sun'
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
