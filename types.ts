
export type UserRole = 'professor' | 'student' | 'admin';
export type Language = 'ar' | 'fr' | 'en';

export enum Medal {
  NONE = 'NONE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
  KING = 'KING'
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  language?: Language;
  university?: string;
  faculty?: string;
  department?: string;
  specialty?: string;
  walletBalance: number;
  avatar: string;
  isApproved: boolean;
  studentCount?: number;
  phoneNumber?: string;
  paymentMethod?: string;
  bio?: string;
}

export interface Channel {
  id: string;
  professorId: string;
  name: string;
  department?: string;
  description: string;
  price: number;
  subscribers: string[];
  content: ContentItem[];
  meetingUrl?: string;
}

export interface ContentItem {
  id: string;
  type: 'pdf' | 'image' | 'video' | 'text';
  title: string;
  url: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  timestamp: Date;
}
