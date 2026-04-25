export type UserRole = 'ADMIN' | 'USER' | 'FINANCE';
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
  parentCategoryId?: string | null;
  children?: CategoryChild[];
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

export type CreditCardBrand =
  | 'VISA'
  | 'MASTERCARD'
  | 'ELO'
  | 'AMEX'
  | 'HIPERCARD'
  | 'OUTRO';
export type InvoiceStatus = 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELED';
export type BudgetPeriod = 'MONTHLY' | 'YEARLY';

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  alertThreshold: number;
  spent: number;
  remaining: number;
  usedPct: number;
  alertReached: boolean;
  exceeded: boolean;
  category: { id: string; name: string; color: string; icon: string; type: CategoryType };
}

export interface CreditCard {
  id: string;
  name: string;
  brand: CreditCardBrand;
  lastDigits?: string | null;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  color: string;
  isActive: boolean;
  usedAmount?: number;
  availableLimit?: number;
  usagePct?: number;
}

export interface Invoice {
  id: string;
  creditCardId: string;
  referenceMonth: number;
  referenceYear: number;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  paidAt?: string | null;
  creditCard?: { id: string; name: string; brand: CreditCardBrand; color: string; lastDigits?: string | null };
  transactions?: Transaction[];
}

export interface GoalContribution {
  id: string;
  amount: number;
  date: string;
  notes?: string | null;
}

export interface Goal {
  id: string;
  name: string;
  description?: string | null;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string | null;
  status: GoalStatus;
  color: string;
  icon: string;
  progress: number;
  remaining: number;
  daysLeft: number | null;
  contributions?: GoalContribution[];
  _count?: { contributions: number };
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
