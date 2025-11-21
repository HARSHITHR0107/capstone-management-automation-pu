export type UserRole = 'admin' | 'student' | 'faculty' | 'reviewer';

export interface User {
  id: string;
  email: string;
  rollNo?: string; // Only for students
  name: string;
  role: UserRole;
  isVerified: boolean;
  specialization?: string; // For faculty/reviewers - will store School value
  maxTeams?: number; // For faculty/reviewers
  teamId?: string; // Team ID the user belongs to (for students)
  createdAt: Date;
  // Additional faculty fields
  title?: string; // Dr., Mr., Ms., etc.
  designation?: string; // Associate Professor, Assistant Professor, etc.
  contactNumber?: string; // Phone number
  employeeId?: string; // Employee ID
  school?: string; // Department/School (PSCS, etc.)
}

export interface Team {
  id: string;
  name: string;
  teamNumber?: string;
  members: string[];
  leaderId: string;
  projectId?: string;
  guideId?: string;
  reviewerId?: string;
  status: 'forming' | 'complete' | 'assigned' | 'in-progress' | 'completed';
  invites: TeamInvite[];
  createdAt: Date;
  projectMaterials?: any[]; // Array of project materials (links, files, etc.)
}

export interface TeamInvite {
  id: string;
  teamId: string;
  invitedUserId: string;
  invitedByUserId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  specialization: string;
  isAssigned: boolean;
  guideId?: string;
  reviewerId?: string;
  createdAt: Date;
}

export interface Evaluation {
  id: string;
  teamId: string;
  evaluatorId: string;
  type: 'guide' | 'reviewer';
  phase: 'proposal' | 'mid-review' | 'final';
  marks?: number;
  comments: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}

export interface Upload {
  id: string;
  teamId: string;
  uploaderId: string;
  fileName: string;
  fileType: 'report' | 'presentation' | 'code' | 'other';
  fileSize: number;
  uploadDate: Date;
}
