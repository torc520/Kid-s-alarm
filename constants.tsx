
import { PaletteNote } from './types';
import { 
  Bed, Utensils, Pill, BookOpen, Flower2, 
  GraduationCap, Brain, Languages, Dumbbell, 
  PenTool, Coffee, Sun, Moon, Briefcase, 
  Users, Target, Bell, Heart, SmilePlus,
  Mic, Music2, Camera, Laptop, MapPin
} from 'lucide-react';

export const COLORS = {
  green: '#bef264',
  lime: '#a3e635',
  emerald: '#34d399',
  teal: '#2dd4bf',
  cyan: '#22d3ee',
  sky: '#7dd3fc',
  blue: '#60a5fa',
  indigo: '#818cf8',
  violet: '#a78bfa',
  purple: '#d8b4fe',
  fuchsia: '#e879f9',
  pink: '#f472b6',
  rose: '#fb7185',
  red: '#f87171',
  orange: '#fdba74',
  amber: '#fbbf24',
  yellow: '#fde047',
  cream: '#fef08a',
  stone: '#a8a29e',
  slate: '#94a3b8',
  sage: '#86efac',
  gold: '#fbbf24',
  coral: '#fb7185',
  lavender: '#e9d5ff',
  mint: '#d1fae5',
  ocean: '#0ea5e9',
  apricot: '#ffedd5',
  clay: '#d6d3d1'
};

export const INITIAL_PALETTE: PaletteNote[] = [
  { color: COLORS.green, label: '' },
  { color: COLORS.sky, label: '' },
  { color: COLORS.violet, label: '' },
  { color: COLORS.red, label: '' },
  { color: COLORS.orange, label: '' },
  { color: COLORS.yellow, label: '' },
];

export const RINGTONES = [
  { name: 'Default', duration: '0:15' },
  { name: 'Morning Birds', duration: '0:30' },
  { name: 'Soft Piano', duration: '1:00' },
  { name: 'Funky Bass', duration: '0:45' },
  { name: 'Synth', duration: '0:20' },
  { name: 'Forest Wind', duration: '2:00' },
  { name: 'Ocean Waves', duration: '1:30' },
  { name: 'Beep 1', duration: '0:12' },
  { name: 'Beep 2', duration: '0:18' }
];

export const ICON_MAP: Record<string, any> = {
  Bed, Utensils, Pill, BookOpen, Flower2, 
  GraduationCap, Brain, Languages, Dumbbell, 
  PenTool, Coffee, Sun, Moon, Briefcase, 
  Users, Target, Bell, Heart, SmilePlus,
  Mic, Music2, Camera, Laptop, MapPin
};

export const ICON_LIST = Object.keys(ICON_MAP);

export const TIMELINE_HEIGHT_BASE = 36; 
export const TIMELINE_HEIGHT_ZOOMED = 120;
