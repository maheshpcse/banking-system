export interface User {
  id: string;
  fullName: string;
  email: string;
  accountNumber: string;
  balance: number;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Transaction {
  _id: string;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  amount: number;
  balanceAfter: number;
  description: string;
  counterpartyAccount?: string | null;
  counterpartyName?: string | null;
  reference: string;
  createdAt: string;
}

export interface AccountSummary {
  user: User;
  recentTransactions: Transaction[];
  monthly: {
    deposits: { total: number; count: number };
    withdrawals: { total: number; count: number };
    transfersIn: { total: number; count: number };
    transfersOut: { total: number; count: number };
  };
}

export interface TransactionListResponse {
  items: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
