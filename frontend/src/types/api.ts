import type { Company, Transaction, User } from './models';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LoginResponse {
  accessToken: string;
  user: User;
  company: Company;
}

export interface RegisterData {
  companyName: string;
  companyDocument?: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface DashboardResponse {
  period: { from: string; to: string };
  kpis: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    pendingIncome: number;
    pendingExpense: number;
    overdueCount: number;
    transactionCount: number;
  };
  chartByDay: Array<{ date: string; income: number; expense: number }>;
  chartByCategory: Array<{
    categoryId: string | null;
    categoryName: string;
    categoryColor: string;
    total: number;
    percentage: number;
  }>;
  chartBySegment: Array<{
    segmentId: string | null;
    segmentName: string;
    segmentColor: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  recentTransactions: Transaction[];
  upcomingDue: Transaction[];
}
