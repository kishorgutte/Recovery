export enum ConsumerStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  NOT_REACHABLE = 'Not reachable',
  CALL_LATER = 'Call later',
  SWITCHED_OFF = 'Switched off',
  WILL_PAY_TODAY = 'Will pay today',
  TD = 'TD', // Temporarily Disconnected
  PD = 'PD', // Permanently Disconnected
  VR = 'VR', // Village Recovery (assuming specialized status)
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
  smsTemplate: "Dear Consumer,\n\nYour electricity bill for Consumer No: *{consumerNo}* is overdue.\nTotal Due: *₹{amount}*.\n\nPlease pay immediately to avoid disconnection.",
  whatsappTemplate: "Dear Consumer,\n\nYour electricity bill for Consumer No: *{consumerNo}* is overdue.\nTotal Due: *₹{amount}*.\n\nPlease pay immediately to avoid disconnection.",
  highDueThreshold: 5000
};