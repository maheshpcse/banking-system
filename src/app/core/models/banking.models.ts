export type UserRole = 'customer' | 'manager' | 'admin';

export type AccountStatus =
  | 'pending'
  | 'address_required'
  | 'under_review'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'blocked'
  | 'deactivated';

export type ApplicationStepStatus = 'complete' | 'current' | 'upcoming' | 'rejected';

export interface UserAvatar {
  style: 'mint' | 'sky' | 'sand' | 'rose' | 'slate';
  initials: string;
  /** Optional profile photo as a data URL */
  image?: string | null;
}

export interface UserSettings {
  emailAlerts: boolean;
  hideBalance: boolean;
  compactLedger: boolean;
  marketingTips: boolean;
  theme?: 'daylight' | 'midnight' | 'sand';
  fontScale?: 'comfortable' | 'compact' | 'large';
}

export interface UserAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export type CardBrand = 'novabank' | 'visa' | 'mastercard' | 'amex' | 'discover';
export type CardAccountType = 'savings' | 'credit' | 'debit' | 'personal' | 'business' | 'other';

export interface BankCard {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  brand: CardBrand;
  accountType?: CardAccountType;
  accountExpiryMonth?: string | null;
  accountExpiryYear?: string | null;
  status: 'pending' | 'active' | 'blocked';
}

export interface ApplicationStep {
  id: string;
  label: string;
  detail: string;
  status: ApplicationStepStatus;
  at?: string;
}

export interface AccountApplication {
  id?: string;
  status: AccountStatus;
  address?: UserAddress | null;
  cardDraft?: Partial<BankCard> | null;
  steps: ApplicationStep[];
  reviewNote?: string | null;
  submittedAt?: string | null;
  decidedAt?: string | null;
}

export interface User {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  /** Empty / null until account generation is approved */
  accountNumber: string | null;
  balance: number;
  role?: UserRole;
  accountStatus?: AccountStatus;
  address?: UserAddress | null;
  card?: BankCard | null;
  application?: AccountApplication | null;
  avatar?: UserAvatar;
  settings?: UserSettings;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken: string;
  maskedEmail?: string;
  username?: string;
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

export type NotificationKind =
  | 'transfer'
  | 'account'
  | 'security'
  | 'admin'
  | 'complaint'
  | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  accountNumber: string | null;
  balance: number;
  createdAt?: string;
}
