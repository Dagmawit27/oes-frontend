export type RoleName = 
  | 'ROLE_ADMIN' 
  | 'ROLE_EXAM_OFFICER' 
  | 'ROLE_INSTRUCTOR' 
  | 'ROLE_STUDENT';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  roles: RoleName[];
  createdAt?: string;
}

export interface LoginResponseData {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  rejectedValue: unknown;
  message: string;
}

export interface ErrorResponse {
  success: boolean;
  status: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  fieldErrors?: ValidationError[];
}
