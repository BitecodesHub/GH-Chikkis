export type ISODate = string;
export type BusinessDate = string;

export const PERMISSIONS = [
  "orders.view",
  "orders.manage",
  "enquiries.manage",
  "customers.view",
  "customers.manage",
  "catalogue.manage",
  "content.edit",
  "content.publish",
  "payments.manage",
  "expenses.manage",
  "reports.view",
  "exports.run",
  "inventory.manage",
  "messaging.manage",
  "messaging.review",
  "users.manage",
  "settings.manage",
  "audit.view",
  "backups.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "OWNER" | "TEAM";

export const PERMISSION_LABELS: Record<Permission, string> = {
  "orders.view": "View orders",
  "orders.manage": "Create and edit orders",
  "enquiries.manage": "Handle enquiries",
  "customers.view": "View customers",
  "customers.manage": "Create and edit customers",
  "catalogue.manage": "Manage products and media",
  "content.edit": "Edit website drafts",
  "content.publish": "Publish website content",
  "payments.manage": "Record payments and refunds",
  "expenses.manage": "Record expenses",
  "reports.view": "View reports",
  "exports.run": "Export data",
  "inventory.manage": "Manage inventory",
  "messaging.manage": "Manage messaging and templates",
  "messaging.review": "Approve queued messages",
  "users.manage": "Manage team access",
  "settings.manage": "Manage business settings",
  "audit.view": "View audit history",
  "backups.manage": "Manage backups",
};

export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: "Orders & enquiries",
    permissions: ["orders.view", "orders.manage", "enquiries.manage"],
  },
  {
    label: "Customers",
    permissions: ["customers.view", "customers.manage"],
  },
  {
    label: "Catalogue & content",
    permissions: ["catalogue.manage", "content.edit", "content.publish"],
  },
  {
    label: "Money",
    permissions: ["payments.manage", "expenses.manage", "reports.view", "exports.run"],
  },
  {
    label: "Operations",
    permissions: ["inventory.manage", "messaging.manage", "messaging.review"],
  },
  {
    label: "Access & security",
    permissions: ["users.manage", "settings.manage", "audit.view", "backups.manage"],
  },
];

export const OWNER_ONLY_PERMISSIONS: Permission[] = [
  "content.publish",
  "messaging.review",
  "users.manage",
  "settings.manage",
  "backups.manage",
];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  active: boolean;
  picture?: string;
  canUsePassword: boolean;
  usesDefaultPassword: boolean;
  createdAt: ISODate;
  lastSignInAt?: ISODate;
}

export interface Address {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneOriginal: string;
  email?: string;
  addresses: Address[];
  company?: string;
  gstin?: string;
  notes?: string;
  archived: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  whatsappConsent?: ConsentState;
  consentSource?: string;
  consentAt?: ISODate;
  importBatchId?: string;
  importRow?: number;
}

export type ConsentState = "GRANTED" | "WITHDRAWN" | "NONE";

export interface MediaAsset {
  id: string;
  url: string;
  publicId?: string;
  alt: string;
  type: "image" | "video";
  width?: number;
  height?: number;
}

export interface PackagingOption {
  id: string;
  label: string;
  grams: number;
  standardPricePaise: number | null;
  pricingNote?: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  tastingNote?: string;
  ingredients?: string;
  nutritionHighlights?: string;
  allergens?: string;
  ingredientsVerified: boolean;
  active: boolean;
  media: MediaAsset[];
  displayOrder: number;
  packaging: PackagingOption[];
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  phoneOriginal: string;
  email?: string;
  quantityKg: number;
  expectedDate: BusinessDate | null;
  notSure: boolean;
  submittedAt: ISODate;
  notes?: string;
  internalNotes?: string;
  whatsappConsent: boolean;
  linkedOrderId?: string;
  updatedAt?: ISODate;
  updatedBy?: string;
  updatedByName?: string;
}

export const ORDER_STATUSES = ["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "New",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export type OrderType = "SALES" | "GIFT";
export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "FULLY_PAID";
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially paid",
  FULLY_PAID: "Fully paid",
};

export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "OTHER";
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "OTHER", label: "Other" },
];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export type DeliveryMethod = "HOME_COLLECTION" | "PORTER" | "COURIER" | "OTHER";
export const DELIVERY_METHODS: { value: DeliveryMethod; label: string }[] = [
  { value: "HOME_COLLECTION", label: "Home collection" },
  { value: "PORTER", label: "Porter" },
  { value: "COURIER", label: "Courier" },
  { value: "OTHER", label: "Other" },
];
export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  HOME_COLLECTION: "Home collection",
  PORTER: "Porter",
  COURIER: "Courier",
  OTHER: "Other",
};

export type WeightBasis = "PER_UNIT" | "TOTAL";

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  packagingId: string | null;
  packagingLabel: string;
  actualWeightGrams: number;
  weightBasis: WeightBasis;
  quantity: number;
  ratePerGramPaise: number;
  standardAmountPaise: number;
  adjustmentPaise: number;
  lineTotalPaise: number;
  notes?: string;
  imported?: boolean;
  quantityLabel?: string;
}

export interface OrderDelivery {
  method: DeliveryMethod;
  chargePaise: number;
  notes?: string;
}

export interface GiftDetails {
  costPaise: number;
  treatment: "NEW_EXPENSE" | "ALREADY_RECORDED";
  note?: string;
  expenseId?: string;
}

export interface CustomerSnapshot {
  name: string;
  phone: string;
  email?: string;
}

export interface OrderStatusChange {
  status: OrderStatus;
  at: ISODate;
  by: string;
  byName?: string;
  note?: string;
}

export interface InvoiceSnapshot {
  version: number;
  issuedAt: ISODate;
  ref: string;
  invoiceDate: BusinessDate;
  customer: CustomerSnapshot;
  items: OrderItem[];
  deliveryMethod: DeliveryMethod;
  deliveryChargePaise: number;
  subtotalPaise: number;
  totalPaise: number;
  business: InvoiceBusinessSnapshot;
  thankYou?: string;
  footerNote?: string;
}

export interface InvoiceBusinessSnapshot {
  name: string;
  city: string;
  state: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  addressLine: string;
}

export interface Order {
  id: string;
  ref: string;
  type: OrderType;
  status: OrderStatus;
  customerId: string | null;
  customerSnapshot: CustomerSnapshot;
  items: OrderItem[];
  delivery: OrderDelivery;
  comments?: string;
  expectedDate?: BusinessDate | null;
  gift?: GiftDetails;
  subtotalPaise: number;
  totalPaise: number;
  orderDate: BusinessDate;
  statusHistory: OrderStatusChange[];
  invoice?: { version: number; issuedAt: ISODate; snapshot: InvoiceSnapshot };
  source: "MANUAL" | "IMPORT";
  historical: boolean;
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: string;
  createdByName?: string;
  updatedBy: string;
  updatedByName?: string;
  paymentStatus: PaymentStatus;
  paidPaise: number;
  refundedPaise: number;
  balancePaise: number;
  whatsappConsent?: ConsentState;
  notificationSummary?: { total: number; failed: number; lastStatus?: NotificationStatus };
  enquiryId?: string;
  idempotencyKey?: string;
  importBatchId?: string;
  importRow?: number;
}

export interface InvoiceVersion {
  id: string;
  orderId: string;
  ref: string;
  version: number;
  snapshot: InvoiceSnapshot;
  createdAt: ISODate;
  createdBy: string;
  createdByName?: string;
  supersededAt?: ISODate;
}

export interface Payment {
  id: string;
  orderId: string;
  amountPaise: number;
  method: PaymentMethod;
  paidAt: ISODate;
  date: BusinessDate;
  reference?: string;
  notes?: string;
  voidedAt?: ISODate;
  voidReason?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: ISODate;
  idempotencyKey?: string;
}

export interface Refund {
  id: string;
  orderId: string;
  paymentId?: string;
  amountPaise: number;
  method: PaymentMethod;
  refundedAt: ISODate;
  date: BusinessDate;
  reason: string;
  createdBy: string;
  createdByName?: string;
  createdAt: ISODate;
  idempotencyKey?: string;
}

export interface Expense {
  id: string;
  date: BusinessDate;
  amountPaise: number;
  category: string;
  description?: string;
  supplier?: string;
  receiptRef?: string;
  paymentMethod?: PaymentMethod;
  inventoryItemId?: string;
  quantity?: number;
  unit?: string;
  giftOrderId?: string;
  source: "MANUAL" | "PURCHASE" | "GIFT";
  createdAt: ISODate;
  createdBy: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  active: boolean;
  currentQuantity: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type InventoryMovementType = "PURCHASE" | "USAGE" | "ADJUSTMENT";
export interface InventoryMovement {
  id: string;
  itemId: string;
  type: InventoryMovementType;
  quantity: number;
  date: BusinessDate;
  notes?: string;
  expenseId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: ISODate;
}

export interface ContentSection {
  heading: string;
  body: string[];
}
export interface ContentFaq {
  question: string;
  answer: string;
}
export interface ContentStep {
  title: string;
  body: string;
  note?: string;
}

export type ContentFieldValue =
  | string
  | string[]
  | ContentSection[]
  | ContentFaq[]
  | ContentStep[];
export type PageContent = Record<string, ContentFieldValue>;

export const CONTENT_PAGES = [
  "home",
  "collection",
  "story",
  "process",
  "gifting",
  "faqs",
  "contact",
  "privacy",
  "terms",
] as const;
export type ContentPageKey = (typeof CONTENT_PAGES)[number];

export interface WebsiteContent {
  page: ContentPageKey;
  draft: PageContent;
  published: PageContent;
  version: number;
  updatedAt: ISODate;
  updatedBy: string;
  updatedByName?: string;
  publishedAt?: ISODate;
  publishedBy?: string;
}

export interface ContentVersion {
  id: string;
  page: ContentPageKey;
  version: number;
  content: PageContent;
  publishedAt: ISODate;
  publishedBy: string;
  publishedByName?: string;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  city: string;
  state: string;
  whatsappNumber: string;
  email: string;
  phoneDisplay: string;
  instagramUrl: string;
  googleReviewUrl: string;
  addressLine: string;
  mapsUrl: string;
  gstin: string;
}

export interface ReviewsSettings {
  enabled: boolean;
  googlePlaceId: string;
}

export interface WhatsAppSettings {
  liveEnabled: boolean;
  paused: boolean;
  pauseReason: string;
  pausedAt: ISODate | null;
  pausedBy: string;
  estimatedCostPerMessagePaise: number;
  monthlySpendThresholdPaise: number;
  alertPercent: number;
}

export interface AppSettings {
  business: BusinessSettings;
  security: { idleMinutes: number };
  whatsapp: WhatsAppSettings;
  invoice: { thankYou: string; footerNote: string };
  reviews: ReviewsSettings;
  expenseCategories: string[];
  backup: { retentionDays: number };
  updatedAt: ISODate;
  updatedBy: string;
}

export type NotificationChannel = "WHATSAPP" | "EMAIL";
export type NotificationType = "ORDER_COMPLETED" | "INVOICE_DETAILS" | "CORRECTION";
export type NotificationStatus =
  | "QUEUED"
  | "NEEDS_REVIEW"
  | "SENDING"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "SIMULATED"
  | "DISCARDED"
  | "BLOCKED";

export type MessageMode = "LIVE" | "SIMULATED";

export interface NotificationJob {
  id: string;
  orderId: string;
  orderRef: string;
  customerId: string | null;
  customerName: string;
  channel: NotificationChannel;
  type: NotificationType;
  recipient: string;
  templateId?: string;
  templateName?: string;
  templateVersion?: number;
  templateLanguage?: string;
  metaTemplateName?: string;
  templateParams?: string[];
  body: string;
  status: NotificationStatus;
  mode: MessageMode;
  idempotencyKey: string;
  attempts: number;
  nextAttemptAt?: ISODate;
  lastAttemptAt?: ISODate;
  needsReview: boolean;
  holdReason?: string;
  blockedReason?: string;
  approvedAt?: ISODate;
  approvedBy?: string;
  providerMessageId?: string;
  lastError?: string;
  orderUpdatedAt?: ISODate;
  customMessage?: string;
  createdAt: ISODate;
  updatedAt: ISODate;
  createdBy: string;
  sentAt?: ISODate;
  deliveredAt?: ISODate;
  readAt?: ISODate;
  events?: NotificationEvent[];
}

export interface NotificationEvent {
  id: string;
  jobId: string;
  providerStatus: string;
  at: ISODate;
  detail?: string;
}

export type TemplateStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";

export interface MessageTemplate {
  id: string;
  key: string;
  channel: NotificationChannel;
  type: NotificationType;
  language: string;
  name: string;
  body: string;
  placeholders: string[];
  metaTemplateName?: string;
  status: TemplateStatus;
  version: number;
  active: boolean;
  updatedAt: ISODate;
  updatedBy: string;
}

export interface TemplateVersion {
  templateId: string;
  version: number;
  body: string;
  status: TemplateStatus;
  at: ISODate;
  by: string;
}

export interface Consent {
  id: string;
  customerId: string | null;
  phone: string;
  purpose: "TRANSACTIONAL";
  granted: boolean;
  source: string;
  note?: string;
  at: ISODate;
  updatedBy: string;
}

export interface EmailMessage {
  id: string;
  orderId: string;
  orderRef: string;
  to: string;
  subject: string;
  body: string;
  status: "SENT" | "FAILED" | "SIMULATED";
  mode: MessageMode;
  providerId?: string;
  error?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: ISODate;
  sentAt?: ISODate;
  retryOfId?: string;
}

export interface AuditEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  diff?: { field: string; from: string; to: string }[];
  requestId?: string;
  at: ISODate;
}

export type AlertType =
  | "NEW_ENQUIRY"
  | "WHATSAPP_FAILED"
  | "WHATSAPP_SPEND"
  | "WHATSAPP_PAUSED"
  | "BACKUP_FAILED"
  | "SYSTEM_ERROR"
  | "CANCELLED_ORDER_PAYMENT";

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  message: string;
  permission?: Permission;
  link?: string;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  createdAt: ISODate;
  updatedAt: ISODate;
  resolvedAt?: ISODate;
  resolvedBy?: string;
}

export type BackupStatus = "RUNNING" | "SUCCESS" | "FAILED";

export interface BackupRun {
  id: string;
  status: BackupStatus;
  startedAt: ISODate;
  finishedAt?: ISODate;
  sizeBytes?: number;
  checksum?: string;
  location?: string;
  provider: string;
  error?: string;
  triggeredBy: string;
  documentCount?: number;
}

export type ImportKind = "CUSTOMERS" | "ORDERS";
export type ImportStatus = "UPLOADED" | "READY" | "PROCESSING" | "IMPORTED" | "FAILED";

export interface ImportBatch {
  id: string;
  kind: ImportKind;
  filename: string;
  headers: string[];
  rows: string[][];
  mapping?: Record<string, string>;
  status: ImportStatus;
  summary?: {
    imported: number;
    skipped: number;
    failed: number;
    errors: string[];
    customersCreated?: number;
    ordersCreated?: number;
  };
  checksum: string;
  createdAt: ISODate;
  createdBy: string;
  createdByName?: string;
  updatedAt?: ISODate;
  completedAt?: ISODate;
}

export type DatePreset = "today" | "7d" | "month" | "year" | "custom";
export interface DateRange {
  preset: DatePreset;
  from: BusinessDate;
  to: BusinessDate;
}

export interface ReportMetrics {
  grossRevenuePaise: number;
  refundsPaise: number;
  netRevenuePaise: number;
  paymentsReceivedPaise: number;
  outstandingPaise: number;
  expensesPaise: number;
  giftingCostPaise: number;
  estimatedProfitPaise: number;
  salesOrders: number;
  completedSalesOrders: number;
  cancelledOrders: number;
  giftOrders: number;
  newEnquiries: number;
}

export interface ReportSeriesPoint {
  date: BusinessDate;
  label: string;
  revenuePaise: number;
  expensesPaise: number;
  paymentsPaise: number;
  profitPaise: number;
}

export interface ReportBreakdown {
  key: string;
  label: string;
  amountPaise: number;
  count?: number;
}

export interface ReportData {
  range: DateRange;
  metrics: ReportMetrics;
  previous: {
    range: DateRange;
    metrics: ReportMetrics;
  };
  series: ReportSeriesPoint[];
  monthly: ReportSeriesPoint[];
  salesByProduct: ReportBreakdown[];
  expensesByCategory: ReportBreakdown[];
  paymentsByMethod: ReportBreakdown[];
  topCustomers: ReportBreakdown[];
  outstandingOrders: {
    orderId: string;
    ref: string;
    customerName: string;
    orderDate: BusinessDate;
    totalPaise: number;
    balancePaise: number;
  }[];
  giftOrdersList: {
    orderId: string;
    ref: string;
    recipient: string;
    orderDate: BusinessDate;
    costPaise: number;
  }[];
  inventory: {
    itemId: string;
    name: string;
    unit: string;
    quantity: number;
    category: string;
  }[];
}

export interface DashboardData {
  today: ReportMetrics;
  week: ReportMetrics;
  month: ReportMetrics;
  recentOrders: Order[];
  recentEnquiries: Enquiry[];
  alerts: SystemAlert[];
  outstandingTotalPaise: number;
  lastBackup?: BackupRun;
  inventory: { id: string; name: string; unit: string; currentQuantity: number }[];
  whatsapp: {
    paused: boolean;
    pauseReason: string;
    queued: number;
    failed: number;
    monthlyEstimatedSpendPaise: number;
    thresholdPaise: number;
  };
}

export interface SearchResults {
  orders: Order[];
  customers: Customer[];
  products: Product[];
  enquiries: Enquiry[];
}
