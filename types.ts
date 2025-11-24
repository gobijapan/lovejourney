export interface CoupleData {
  startDate: string; // ISO Date string
  bgImage: string | null; // Base64 or URL
  bgOpacity: number; // 0.1 to 1.0
  partner1Name: string;
  partner2Name: string;
  partner1Dob: string;
  partner2Dob: string;
  partner1Avatar: string | null;
  partner2Avatar: string | null;
  securityPin: string | null; // Null means disabled
  themeEffect: 'hearts' | 'snow' | 'stars' | 'fireflies' | 'none';
  countFromDayOne: boolean; 
  
  // New Settings
  themeColor: string; // Hex color
  fontStyle: 'sans' | 'serif' | 'rounded' | 'fun' | 'classic' | 'modern' | 'handwriting';
  showTimeDetails: boolean; // Show hours/min/sec
  globalBackground: boolean; // Apply bgImage to all tabs
  notifications: {
    anniversary: boolean;
    valentine: boolean;
    holidays: boolean;
    onThisDay: boolean; // Added new setting
  };
  reminderDays: number[]; // Array of days before event to remind (e.g. [0, 1, 3, 7])
}

export interface Memory {
  id: string;
  date: string;
  title: string;
  type: 'text' | 'voice' | 'image' | 'mixed';
  content: string; 
  images?: string[]; // Updated to support multiple images
  mediaUrl?: string; // Legacy support
  tags: string[];
}

export interface PlanItem {
  id: string;
  title: string;
  description?: string; // Added description
  priority: 'low' | 'medium' | 'high'; // Added priority
  targetDate: string; // ISO date for countdown
  isPinned: boolean; // Show on Home
  completed: boolean;
  reminderEnabled?: boolean;
  reminderTime?: string; // ISO string including time
}

export interface PlaceRecommendation {
  title: string;
  address: string;
  rating?: string;
  uri?: string;
  description?: string;
}

export enum AppView {
  HOME = 'home',
  MEMORIES = 'memories',
  PLANS = 'plans',
  PLACES = 'places',
  SETTINGS = 'settings',
}

export interface DetailedTime {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
}