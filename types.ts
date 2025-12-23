
export type UserRole = 'professor' | 'student' | 'admin';

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
  university?: string;
  faculty?: string;
  specialty?: string; // Added field for what they teach
  walletBalance: number;
  avatar: string;
  isApproved: boolean;
  studentCount?: number;
}

export interface Channel {
  id: string;
  professorId: string;
  name: string;
  description: string;
  price: number;
  subscribers: string[];
  content: ContentItem[];
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
  timestamp: Date;
}
