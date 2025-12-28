
export enum ConsumerStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  NOT_REACHABLE = 'Not reachable',
  CALL_LATER = 'Call later',
  SWITCHED_OFF = 'Switched off',
  WILL_PAY_TODAY = 'Will pay today',
  NUMBER_CHANGED = 'Number Changed',
  NUMBER_NA = 'Number NA',
  TD = 'TD', // Temporarily Disconnected
  PD = 'PD', // Permanently Disconnected
  VR = 'VR', // Village Recovery (assuming specialized status)
  ROAD_WIDENING = 'Road widening',
}

export interface PaymentReceipt {
  Amount: string;
  TransactionDateTime: string;
  receiptMedium: string;
}

export interface BillHistory {
  BillMonth: string;
  Consumption: string;
  meterStatus: string;
  consumerStatus: string;
  CurrentBill: string;
  BillDate: string;
  Receipts: PaymentReceipt[];
  tariffCode?: string;
  tariffDesc: string;
  theftBillRevisions?: any[];
}

export interface Consumer {
  consumerNo: string; // Primary Key
  name: string;
  address: string;
  mobile: string;
  totalDue: number;
  billDueDate: string;
  ageInDays: number;
  lastReceiptDate: string;
  closingBalance: number;
  subCategory: string;
  meterNumber: string;
  remark: string;
  tdPdDate?: string;
  
  // App specific fields
  status: ConsumerStatus;
  nextFollowUpDate?: string; // YYYY-MM-DD
  updatedAt: string;
  
  // New field for Paid History
  billHistory?: BillHistory[];
}

export interface FollowUpHistory {
  id: number; // Auto-increment
  consumerNo: string;
  note: string;
  status: ConsumerStatus;
  timestamp: string;
}

export interface DashboardStats {
  todayFollowUps: number;
  todayPaidCount: number;
  todayCollectedAmount: number;
  unpaidCount: number;
  highDueCount: number;
}

export interface AppSettings {
  smsTemplate: string;
  whatsappTemplate: string;
  highDueThreshold: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  smsTemplate: "Dear Consumer,\nYour electricity bill for Consumer No: *{consumerNo}* is overdue.\nTotal Due: *₹{amount}*.\nPlease pay immediately to avoid disconnection.",
  whatsappTemplate: "Dear Consumer,\nYour electricity bill for Consumer No: *{consumerNo}* is overdue.\nTotal Due: *₹{amount}*.\nPlease pay immediately to avoid disconnection.",
  highDueThreshold: 5000
};
