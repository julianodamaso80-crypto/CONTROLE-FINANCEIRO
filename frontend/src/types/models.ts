export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'FINANCE';
export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';
export type BankAccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'CASH'
  | 'INVESTMENT'
  | 'OTHER';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type TransactionSource = 'MANUAL' | 'WHATSAPP' | 'IMPORT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  phone?: string | null;
  isActive: boolean;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  document?: string | null;
  phone?: string | null;
  plan: string;
  whatsappNumber?: string | null;
}

export interface CategoryChild {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  parentCategoryId?: string | null;
  parent?: { id: string; name: string } | null;
  children?: CategoryChild[];
}

export interface Segment {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  _count?: { transactions: number };
}

export interface BankAccount {
  id: string;
  name: string;
  type: BankAccountType;
  bankCode?: string | null;
  currentBalance: string | number;
  currency: string;
  isActive: boolean;
}

export interface Client {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Supplier {
  id: string;
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: string | number;
  description: string;
  date: string;
  dueDate?: string | null;
  paymentDate?: string | null;
  status: TransactionStatus;
  source: TransactionSource;
  notes?: string | null;
  tags: string[];
  categoryId?: string | null;
  clientId?: string | null;
  supplierId?: string | null;
  segmentId?: string | null;
  category?: Category | null;
  client?: Client | null;
  supplier?: Supplier | null;
  segment?: Segment | null;
  accountTransactions?: Array<{ id: string; bankAccount: BankAccount }>;
  createdAt: string;
  updatedAt: string;
}
