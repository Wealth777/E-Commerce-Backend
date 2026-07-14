const USER_TYPES = Object.freeze({
    BUYER: 'Buyer',
    VENDOR: 'Vendor',
    FOUNDER: 'Founder'
});

/**
 * Supported Ticket Types
 */
const TICKET_TYPES = Object.freeze({
    GENERAL: 'general',
    SECURITY: 'security',
    PAYMENT: 'payment',
    VERIFICATION: 'verification',
    TECHNICAL: 'technical',
    SUSPENSION: 'suspension'
});

/**
 * Ticket Status
 */
const TICKET_STATUS = Object.freeze({
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    WAITING_FOR_USER: 'waiting_for_user',
    WAITING_FOR_SUPPORT: 'waiting_for_support',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    REJECTED: 'rejected'
});

/**
 * Ticket Priority
 */
const TICKET_PRIORITY = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
});

/**
 * Security Issue Categories
 */
const SECURITY_CATEGORIES = Object.freeze({
    UNAUTHORIZED_LOGIN: 'unauthorized_login',
    ACCOUNT_HACKED: 'account_hacked',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    PHISHING: 'phishing',
    IDENTITY_THEFT: 'identity_theft',
    FAKE_BUYER: 'fake_buyer',
    FAKE_VENDOR: 'fake_vendor',
    SCAM: 'scam',
    SPAM: 'spam',
    ACCOUNT_IMPERSONATION: 'account_impersonation',
    DATA_BREACH: 'data_breach',
    OTHER: 'other'
});

/**
 * Payment Categories
 */
const PAYMENT_CATEGORIES = Object.freeze({
    PAYMENT_FAILED: 'payment_failed',
    PAYMENT_PENDING: 'payment_pending',
    DOUBLE_CHARGED: 'double_charged',
    REFUND_REQUEST: 'refund_request',
    REFUND_DELAYED: 'refund_delayed',
    WALLET_ISSUE: 'wallet_issue',
    WITHDRAWAL_FAILED: 'withdrawal_failed',
    INVALID_TRANSACTION: 'invalid_transaction',
    OTHER: 'other'
});

/**
 * Verification Categories
 */
const VERIFICATION_CATEGORIES = Object.freeze({
    STUDENT_VERIFICATION: 'student_verification',
    BUSINESS_VERIFICATION: 'business_verification',
    ID_VERIFICATION: 'id_verification',
    DOCUMENT_REJECTED: 'document_rejected',
    DOCUMENT_UPLOAD: 'document_upload',
    OTHER: 'other'
});

/**
 * Technical Categories
 */
const TECHNICAL_CATEGORIES = Object.freeze({
    LOGIN_PROBLEM: 'login_problem',
    APP_CRASH: 'app_crash',
    WEBSITE_BUG: 'website_bug',
    IMAGE_UPLOAD: 'image_upload',
    NOTIFICATION_ISSUE: 'notification_issue',
    PERFORMANCE: 'performance',
    FEATURE_NOT_WORKING: 'feature_not_working',
    OTHER: 'other'
});

/**
 * Suspension Categories
 */
const SUSPENSION_CATEGORIES = Object.freeze({
    ACCOUNT_SUSPENDED: 'account_suspended',
    STORE_SUSPENDED: 'store_suspended',
    APPEAL: 'appeal',
    POLICY_REVIEW: 'policy_review',
    OTHER: 'other'
});

/**
 * General Support Categories
 */
const GENERAL_CATEGORIES = Object.freeze({
    ACCOUNT: 'account',
    PRODUCTS: 'products',
    ORDERS: 'orders',
    DELIVERY: 'delivery',
    SUGGESTION: 'suggestion',
    QUESTION: 'question',
    FEEDBACK: 'feedback',
    OTHER: 'other'
});

/**
 * Category Mapping
 */
const TICKET_CATEGORY_MAP = Object.freeze({
    [TICKET_TYPES.SECURITY]: Object.values(SECURITY_CATEGORIES),

    [TICKET_TYPES.PAYMENT]: Object.values(PAYMENT_CATEGORIES),

    [TICKET_TYPES.VERIFICATION]: Object.values(VERIFICATION_CATEGORIES),

    [TICKET_TYPES.TECHNICAL]: Object.values(TECHNICAL_CATEGORIES),

    [TICKET_TYPES.SUSPENSION]: Object.values(SUSPENSION_CATEGORIES),

    [TICKET_TYPES.GENERAL]: Object.values(GENERAL_CATEGORIES)
});


const ATTACHMENT = Object.freeze({
    MAX_FILES: 5,

    MAX_FILE_SIZE: 5 * 1024 * 1024,

    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf'
    ]
});


const PAGINATION = Object.freeze({
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
});


const TICKET_NUMBER = Object.freeze({
    PREFIX: 'CT',
    SUPPORT_PREFIX: 'SUP',
    PAD_LENGTH: 6
});


const SLA = Object.freeze({
    LOW: 72,
    MEDIUM: 48,
    HIGH: 24,
    URGENT: 4
});


const SORT_OPTIONS = Object.freeze({
    NEWEST: '-createdAt',
    OLDEST: 'createdAt',
    PRIORITY: '-priority',
    UPDATED: '-updatedAt'
});


const STATUS_TRANSITIONS = Object.freeze({
    open: [
        'in_progress',
        'waiting_for_user',
        'resolved',
        'closed',
        'rejected'
    ],

    in_progress: [
        'waiting_for_user',
        'resolved',
        'closed'
    ],

    waiting_for_user: [
        'in_progress',
        'resolved',
        'closed'
    ],

    waiting_for_support: [
        'in_progress',
        'resolved'
    ],

    resolved: [
        'closed',
        'open'
    ],

    closed: [
        'open'
    ],

    rejected: []
});


module.exports = {
    USER_TYPES,

    TICKET_TYPES,

    TICKET_STATUS,

    TICKET_PRIORITY,

    SECURITY_CATEGORIES,

    PAYMENT_CATEGORIES,

    VERIFICATION_CATEGORIES,

    TECHNICAL_CATEGORIES,

    SUSPENSION_CATEGORIES,

    GENERAL_CATEGORIES,

    TICKET_CATEGORY_MAP,

    ATTACHMENT,

    PAGINATION,

    TICKET_NUMBER,

    SLA,

    SORT_OPTIONS,

    STATUS_TRANSITIONS
};