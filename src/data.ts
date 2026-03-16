export interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  role: 'admin' | 'user' | 'auditor';
  apiKey: string;
  fullName: string;
  ssn: string;
  phone: string;
  createdAt: string;
}

export interface Account {
  id: number;
  userId: number;
  accountNumber: string;
  balance: number;
  type: 'checking' | 'savings';
  createdAt: string;
}

export interface Transaction {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

export interface CreditCard {
  id: number;
  userId: number;
  cardNumber: string;
  cvv: string;
  expiryDate: string;
  cardholderName: string;
  billingAddress: string;
}

// Credentials loaded from environment variables — not hardcoded in source
const credentials = {
  admin: {password: process.env.VB_ADMIN_PASS!, apiKey: process.env.VB_ADMIN_KEY!},
  john: {password: process.env.VB_USER1_PASS!, apiKey: process.env.VB_USER1_KEY!},
  jane: {password: process.env.VB_USER2_PASS!, apiKey: process.env.VB_USER2_KEY!},
  auditor: {password: process.env.VB_AUDITOR_PASS!, apiKey: process.env.VB_AUDITOR_KEY!},
};

export const users: User[] = [
  {
    id: 1,
    username: 'admin',
    password: credentials.admin.password,
    email: 'admin@vulnbank.com',
    role: 'admin',
    apiKey: credentials.admin.apiKey,
    fullName: 'Admin User',
    ssn: '123-45-6789',
    phone: '555-0100',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'john',
    password: credentials.john.password,
    email: 'john@example.com',
    role: 'user',
    apiKey: credentials.john.apiKey,
    fullName: 'John Doe',
    ssn: '987-65-4321',
    phone: '555-0200',
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 3,
    username: 'jane',
    password: credentials.jane.password,
    email: 'jane@example.com',
    role: 'user',
    apiKey: credentials.jane.apiKey,
    fullName: 'Jane Smith',
    ssn: '456-78-9012',
    phone: '555-0300',
    createdAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 4,
    username: 'auditor',
    password: credentials.auditor.password,
    email: 'auditor@vulnbank.com',
    role: 'auditor',
    apiKey: credentials.auditor.apiKey,
    fullName: 'Bob Auditor',
    ssn: '111-22-3333',
    phone: '555-0400',
    createdAt: '2024-04-10T00:00:00Z',
  },
];

export const accounts: Account[] = [
  {
    id: 1,
    userId: 1,
    accountNumber: '1000000001',
    balance: 50000.0,
    type: 'checking',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    userId: 1,
    accountNumber: '1000000002',
    balance: 150000.0,
    type: 'savings',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    userId: 2,
    accountNumber: '2000000001',
    balance: 5200.5,
    type: 'checking',
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 4,
    userId: 2,
    accountNumber: '2000000002',
    balance: 12000.0,
    type: 'savings',
    createdAt: '2024-02-15T00:00:00Z',
  },
  {
    id: 5,
    userId: 3,
    accountNumber: '3000000001',
    balance: 3100.75,
    type: 'checking',
    createdAt: '2024-03-20T00:00:00Z',
  },
  {
    id: 6,
    userId: 4,
    accountNumber: '4000000001',
    balance: 8500.0,
    type: 'checking',
    createdAt: '2024-04-10T00:00:00Z',
  },
];

export const transactions: Transaction[] = [
  {
    id: 1,
    fromAccountId: 1,
    toAccountId: 3,
    amount: 500.0,
    description: 'Monthly transfer',
    status: 'completed',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 2,
    fromAccountId: 3,
    toAccountId: 5,
    amount: 150.0,
    description: 'Payment to Jane',
    status: 'completed',
    createdAt: '2024-06-02T14:30:00Z',
  },
  {
    id: 3,
    fromAccountId: 5,
    toAccountId: 1,
    amount: 75.25,
    description: 'Refund',
    status: 'completed',
    createdAt: '2024-06-03T09:15:00Z',
  },
  {
    id: 4,
    fromAccountId: 2,
    toAccountId: 6,
    amount: 1000.0,
    description: 'Audit fee',
    status: 'pending',
    createdAt: '2024-06-04T16:45:00Z',
  },
  {
    id: 5,
    fromAccountId: 4,
    toAccountId: 1,
    amount: 250.0,
    description: 'Loan repayment',
    status: 'completed',
    createdAt: '2024-06-05T11:20:00Z',
  },
];

export const creditCards: CreditCard[] = [
  {
    id: 1,
    userId: 1,
    cardNumber: '4532015112830366',
    cvv: '123',
    expiryDate: '12/2027',
    cardholderName: 'Admin User',
    billingAddress: '123 Admin St',
  },
  {
    id: 2,
    userId: 2,
    cardNumber: '4916338506082832',
    cvv: '456',
    expiryDate: '06/2026',
    cardholderName: 'John Doe',
    billingAddress: '456 Oak Ave',
  },
  {
    id: 3,
    userId: 3,
    cardNumber: '4024007103939509',
    cvv: '789',
    expiryDate: '09/2025',
    cardholderName: 'Jane Smith',
    billingAddress: '789 Pine Rd',
  },
  {
    id: 4,
    userId: 4,
    cardNumber: '4485983356242217',
    cvv: '321',
    expiryDate: '03/2028',
    cardholderName: 'Bob Auditor',
    billingAddress: '321 Elm Blvd',
  },
];

let nextUserId = 5;
let nextAccountId = 7;
let nextTransactionId = 6;

export function addUser(user: Omit<User, 'id' | 'apiKey' | 'createdAt'>): User {
  const newUser: User = {
    ...user,
    id: nextUserId++,
    apiKey: `vb-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  accounts.push({
    id: nextAccountId++,
    userId: newUser.id,
    accountNumber: `${newUser.id}000000001`,
    balance: 0,
    type: 'checking',
    createdAt: new Date().toISOString(),
  });

  return newUser;
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const newTx: Transaction = {
    ...tx,
    id: nextTransactionId++,
    createdAt: new Date().toISOString(),
  };
  transactions.push(newTx);
  return newTx;
}
