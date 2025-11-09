import type { Timestamp } from 'firebase/firestore';

export type MessageCategory =
  | 'anxiety'
  | 'sadness'
  | 'loneliness'
  | 'tiredness'
  | 'fear'
  | 'other';

export type MessageStatus = 'waiting' | 'answered' | 'expired';

export type ResponseType = 'custom' | 'quick' | 'ai-assisted';

export type ReportReason =
  | 'offensive'
  | 'inappropriate'
  | 'sarcasm'
  | 'spam'
  | 'other';

export interface Message {
  id: string;
  text: string;
  category: MessageCategory;
  createdAt: Timestamp;
  status: MessageStatus;
  deviceId: string;
  moderationPassed: boolean;
  answeredAt?: Timestamp;
  expiresAt: Timestamp;
}

export interface Response {
  id: string;
  messageId: string;
  text: string;
  createdAt: Timestamp;
  deviceId: string;
  moderationPassed: boolean;
  type: ResponseType;
  wasHelpful?: boolean;
  reportCount: number;
}

export interface UserStats {
  deviceId: string;
  lightsGiven: number;
  lightsReceived: number;
  messagesSent: number;
  lastActiveAt: Timestamp;
  createdAt: Timestamp;
  karmaScore: number;
}

export interface Report {
  id: string;
  responseId: string;
  reason: ReportReason;
  description?: string;
  reportedAt: Timestamp;
  status: 'pending' | 'reviewed' | 'action_taken';
}
