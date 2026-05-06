# Backend Order Return & Refund Request Implementation

## Overview
Complete backend implementation for Order Return and Refund Request functionality with full validation, authorization, and audit logging.

## Files Modified

### 1. Models
**`models/buyerOrder.model.js`**
- Added `cancelledBy` object to track who cancelled the order
- Added `refundRequest` object for refund request management
- Added `returnRequest` object for return request management

### 2. Controllers
**`controllers/buyer.controller.js`**
- Updated `buyerCancelOrder()` to record cancelledBy information
- Added `requestRefund()` - Buyer initiates refund request
- Added `requestReturn()` - Buyer initiates return request

**`controllers/vendor.controller.js`**
- Added `getRefundRequests()` - Vendor retrieves all refund requests
- Added `getReturnRequests()` - Vendor retrieves all return requests
- Added `reviewRefundRequest()` - Vendor approves/rejects refund
- Added `reviewReturnRequest()` - Vendor approves/rejects return

### 3. Routes
**`routes/buyer.route.js`**
- Added exports for new functions
- Added POST `/orders/:orderId/refund-request`
- Added POST `/orders/:orderId/return-request`

**`routes/vendor.route.js`**
- Added exports for new functions
- Added GET `/orders/refund-requests`
- Added GET `/orders/return-requests`
- Added PATCH `/orders/:orderId/refund-request/review`
- Added PATCH `/orders/:orderId/return-request/review`

---

## Data Model Structure

### New Fields in BuyerOrder Schema

#### `cancelledBy` Object
```javascript
cancelledBy: {
  role: String,           // "buyer" | "vendor" | "admin"
  user: ObjectId,         // Reference to User who cancelled
  cancelledAt: Date       // Timestamp of cancellation
}
```

#### `refundRequest` Object
```javascript
refundRequest: {
  requested: Boolean,     // Whether refund was requested
  status: String,         // "none" | "pending" | "approved" | "rejected" | "completed"
  reason: String,         // Buyer's reason for refund
  details: String,        // Additional details from buyer
  requestedAt: Date,      // When refund was requested
  reviewedAt: Date,       // When vendor reviewed
  reviewedBy: ObjectId,   // Vendor who reviewed (reference to Vendor)
  response: String        // Vendor's response message
}
```

#### `returnRequest` Object
```javascript
returnRequest: {
  requested: Boolean,     // Whether return was requested
  status: String,         // "none" | "pending" | "approved" | "rejected" | "completed"
  reason: String,         // Buyer's reason for return
  details: String,        // Additional details from buyer
  requestedAt: Date,      // When return was requested
  reviewedAt: Date,       // When vendor reviewed
  reviewedBy: ObjectId,   // Vendor who reviewed (reference to Vendor)
  response: String        // Vendor's response message
}
```

---

## API Endpoints

### BUYER ENDPOINTS

#### 1. Request Refund
**Endpoint:** `POST /buyer/orders/:orderId/refund-request`

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Request Body:**
```json
{
  "reason": "Product quality is poor",
  "details": "The product arrived damaged"
}
```

**Validations:**
- Token must be valid (verified by middleware)
- `reason` is required and cannot be empty
- Order must exist
- Order must belong to the authenticated buyer
- Order status must be "cancelled"
- Order must have been cancelled by the buyer
- No pending/approved/completed refund request should already exist

**Success Response (201):**
```json
{
  "success": true,
  "message": "Refund request submitted successfully",
  "data": {
    "orderId": "64a1234567890abcdef12345",
    "refundRequest": {
      "requested": true,
      "status": "pending",
      "reason": "Product quality is poor",
      "details": "The product arrived damaged",
      "requestedAt": "2024-01-15T10:30:00Z",
      "reviewedAt": null,
      "reviewedBy": null,
      "response": ""
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing reason:
```json
{
  "success": false,
  "message": "Reason is required for refund request"
}
```

- **404 Not Found** - Order doesn't exist:
```json
{
  "success": false,
  "message": "Order not found"
}
```

- **403 Forbidden** - Not order owner:
```json
{
  "success": false,
  "message": "You can only request refund for your own orders"
}
```

- **400 Bad Request** - Order not cancelled:
```json
{
  "success": false,
  "message": "Refund request can only be made for cancelled orders"
}
```

- **400 Bad Request** - Not cancelled by buyer:
```json
{
  "success": false,
  "message": "Refund request can only be made for orders cancelled by you"
}
```

- **400 Bad Request** - Refund request already exists:
```json
{
  "success": false,
  "message": "A refund request already exists with status: pending"
}
```

---

#### 2. Request Return
**Endpoint:** `POST /buyer/orders/:orderId/return-request`

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Request Body:**
```json
{
  "reason": "Product doesn't match description",
  "details": "Wrong size received"
}
```

**Validations:**
- Token must be valid
- `reason` is required and cannot be empty
- Order must exist
- Order must belong to the authenticated buyer
- Order status must be "delivered"
- No pending/approved/completed return request should already exist

**Success Response (201):**
```json
{
  "success": true,
  "message": "Return request submitted successfully",
  "data": {
    "orderId": "64a1234567890abcdef12345",
    "returnRequest": {
      "requested": true,
      "status": "pending",
      "reason": "Product doesn't match description",
      "details": "Wrong size received",
      "requestedAt": "2024-01-15T10:30:00Z",
      "reviewedAt": null,
      "reviewedBy": null,
      "response": ""
    }
  }
}
```

**Error Responses:** (Similar structure to refund, but with "Return" context)

- **400 Bad Request** - Order not delivered:
```json
{
  "success": false,
  "message": "Return request can only be made for delivered orders"
}
```

---

### VENDOR ENDPOINTS

#### 1. Get All Refund Requests
**Endpoint:** `GET /vendor/orders/refund-requests`

**Authentication:** Required (Bearer Token)

**Query Parameters:** None

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "orderId": "64a1234567890abcdef12345",
      "buyerInfo": {
        "id": "64b1111111111111111111111",
        "username": "buyer123",
        "email": "buyer@example.com",
        "fullName": "John Doe"
      },
      "orderStatus": "cancelled",
      "pricing": {
        "subtotal": 5000,
        "deliveryFee": 500,
        "tax": 10,
        "total": 5510
      },
      "refundRequest": {
        "requested": true,
        "status": "pending",
        "reason": "Product quality is poor",
        "details": "The product arrived damaged",
        "requestedAt": "2024-01-15T10:30:00Z",
        "reviewedAt": null,
        "reviewedBy": null,
        "response": ""
      }
    },
    {
      "orderId": "64a9999999999999999999999",
      "buyerInfo": {
        "id": "64b2222222222222222222222",
        "username": "buyer456",
        "email": "buyer2@example.com",
        "fullName": "Jane Smith"
      },
      "orderStatus": "cancelled",
      "pricing": {
        "subtotal": 8000,
        "deliveryFee": 1000,
        "tax": 10,
        "total": 9010
      },
      "refundRequest": {
        "requested": true,
        "status": "pending",
        "reason": "Changed mind",
        "details": "",
        "requestedAt": "2024-01-14T15:20:00Z",
        "reviewedAt": null,
        "reviewedBy": null,
        "response": ""
      }
    }
  ]
}
```

**Error Response (500):**
```json
{
  "success": false,
  "message": "Error fetching refund requests",
  "error": "Error details"
}
```

---

#### 2. Get All Return Requests
**Endpoint:** `GET /vendor/orders/return-requests`

**Authentication:** Required (Bearer Token)

**Query Parameters:** None

**Success Response (200):** (Similar structure to refund requests)

---

#### 3. Review Refund Request
**Endpoint:** `PATCH /vendor/orders/:orderId/refund-request/review`

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Request Body:**
```json
{
  "action": "approved",
  "response": ""
}
```

OR (for rejection):
```json
{
  "action": "rejected",
  "response": "The order was delivered in perfect condition as per photos"
}
```

**Validations:**
- Token must be valid
- `action` must be "approved" or "rejected"
- If action is "rejected", `response` is required and cannot be empty
- Order must exist and belong to the vendor
- Refund request must exist for the order
- Refund request status must be "pending"

**Success Response (200) - Approved:**
```json
{
  "success": true,
  "message": "Refund request approved",
  "data": {
    "orderId": "64a1234567890abcdef12345",
    "refundRequest": {
      "requested": true,
      "status": "approved",
      "reason": "Product quality is poor",
      "details": "The product arrived damaged",
      "requestedAt": "2024-01-15T10:30:00Z",
      "reviewedAt": "2024-01-15T14:45:00Z",
      "reviewedBy": "64c1234567890abcdef12345",
      "response": ""
    }
  }
}
```

**Success Response (200) - Rejected:**
```json
{
  "success": true,
  "message": "Refund request rejected",
  "data": {
    "orderId": "64a1234567890abcdef12345",
    "refundRequest": {
      "requested": true,
      "status": "rejected",
      "reason": "Product quality is poor",
      "details": "The product arrived damaged",
      "requestedAt": "2024-01-15T10:30:00Z",
      "reviewedAt": "2024-01-15T14:45:00Z",
      "reviewedBy": "64c1234567890abcdef12345",
      "response": "The order was delivered in perfect condition as per photos"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid action:
```json
{
  "success": false,
  "message": "Action must be either 'approved' or 'rejected'"
}
```

- **400 Bad Request** - Missing response on rejection:
```json
{
  "success": false,
  "message": "Response message is required when rejecting refund request"
}
```

- **404 Not Found** - Order not found or no permission:
```json
{
  "success": false,
  "message": "Order not found or you do not have permission"
}
```

- **400 Bad Request** - No refund request exists:
```json
{
  "success": false,
  "message": "No refund request found for this order"
}
```

- **400 Bad Request** - Not pending:
```json
{
  "success": false,
  "message": "Cannot review refund request with status: approved"
}
```

---

#### 4. Review Return Request
**Endpoint:** `PATCH /vendor/orders/:orderId/return-request/review`

**Authentication:** Required (Bearer Token)

**Path Parameters:**
- `orderId` (string, required) - Order ID

**Request Body:** (Same as refund request review)

**Success Response (200):** (Same structure as refund request review, but with returnRequest)

---

## Business Rules Enforced

### Refund Request Rules
1. ✅ Can only be requested for CANCELLED orders
2. ✅ Can only be requested if cancelled BY THE BUYER
3. ✅ Only order owner can request
4. ✅ Reason is mandatory
5. ✅ Cannot submit if request already exists and is pending/approved/completed
6. ✅ Tracks who (vendor) reviews and when

### Return Request Rules
1. ✅ Can only be requested for DELIVERED orders
2. ✅ Only order owner can request
3. ✅ Reason is mandatory
4. ✅ Cannot submit if request already exists and is pending/approved/completed
5. ✅ Tracks who (vendor) reviews and when

### Review Rules
1. ✅ Only vendor can review their orders' requests
2. ✅ Can only review PENDING requests
3. ✅ Action must be "approved" or "rejected"
4. ✅ Rejection requires response message
5. ✅ Approval doesn't require response message

### Security Rules
1. ✅ All endpoints require valid JWT token
2. ✅ Buyers can only request for their own orders
3. ✅ Vendors can only review/view their own orders' requests
4. ✅ All actions are logged in AuditLog

---

## Audit Logging

All actions are logged with the following events:

**Buyer Actions:**
- `REFUND_REQUEST_CREATED` - When buyer requests refund
- `RETURN_REQUEST_CREATED` - When buyer requests return

**Vendor Actions:**
- `REFUND_REQUEST_APPROVED` - When vendor approves refund
- `REFUND_REQUEST_REJECTED` - When vendor rejects refund
- `RETURN_REQUEST_APPROVED` - When vendor approves return
- `RETURN_REQUEST_REJECTED` - When vendor rejects return

---

## Manual Backend Testing Guide

### Prerequisites
1. Have two buyer accounts
2. Have two vendor accounts
3. Create orders as buyer from different vendors

### Test Scenario 1: Refund Request Workflow

#### Step 1: Create Order (if not exists)
```
POST /buyer/checkout
Body:
{
  "items": [...],
  "subtotal": 5000,
  "deliveryFee": 500,
  "totalTax": 10,
  "orderTotal": 5510,
  "delivery": "standard",
  "paymentMethod": "pod",
  "state": "Lagos",
  "address": "123 Main St"
}
Response: Get orderId from response
```

#### Step 2: Cancel Order (by buyer)
```
POST /buyer/orders/action/cancelorder
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "orderId": "64a1234567890abcdef12345"
}
Response: status should be "cancelled"
```

#### Step 3: Request Refund (by buyer)
```
POST /buyer/orders/64a1234567890abcdef12345/refund-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "Product quality is poor",
  "details": "The product arrived damaged"
}
Expected Response: 201 Created with refundRequest.status = "pending"
```

#### Step 4: Get Refund Requests (as vendor)
```
GET /vendor/orders/refund-requests
Headers: Authorization: Bearer <vendor_token>
Expected Response: 200 OK, should see the refund request
```

#### Step 5: Approve Refund (by vendor)
```
PATCH /vendor/orders/64a1234567890abcdef12345/refund-request/review
Headers: Authorization: Bearer <vendor_token>
Body:
{
  "action": "approved",
  "response": ""
}
Expected Response: 200 OK, refundRequest.status = "approved"
```

#### Step 6: Verify Refund Status
```
GET /buyer/orders/64a1234567890abcdef12345
Headers: Authorization: Bearer <buyer_token>
Expected: refundRequest.status = "approved", refundRequest.reviewedAt is set
```

---

### Test Scenario 2: Refund Request Rejection

#### Step 1-2: Same as above (Cancel Order)

#### Step 3: Request Refund
```
POST /buyer/orders/64a1234567890abcdef12345/refund-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "Product quality is poor",
  "details": "The product arrived damaged"
}
Expected Response: 201 Created
```

#### Step 4: Reject Refund (by vendor)
```
PATCH /vendor/orders/64a1234567890abcdef12345/refund-request/review
Headers: Authorization: Bearer <vendor_token>
Body:
{
  "action": "rejected",
  "response": "The product was delivered in perfect condition. Check photos."
}
Expected Response: 200 OK, refundRequest.status = "rejected"
```

---

### Test Scenario 3: Return Request Workflow

#### Step 1: Confirm Delivery (if order is not yet delivered)
```
POST /buyer/orders/action/confirmdelivered
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "orderId": "64a9876543210abcdef12345"
}
Expected: order.status = "delivered"
```

#### Step 2: Request Return (by buyer)
```
POST /buyer/orders/64a9876543210abcdef12345/return-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "Product doesn't match description",
  "details": "Wrong size, wanted L but got S"
}
Expected Response: 201 Created with returnRequest.status = "pending"
```

#### Step 3: Get Return Requests (as vendor)
```
GET /vendor/orders/return-requests
Headers: Authorization: Bearer <vendor_token>
Expected Response: 200 OK, should see the return request
```

#### Step 4: Approve Return (by vendor)
```
PATCH /vendor/orders/64a9876543210abcdef12345/return-request/review
Headers: Authorization: Bearer <vendor_token>
Body:
{
  "action": "approved",
  "response": ""
}
Expected Response: 200 OK, returnRequest.status = "approved"
```

---

### Test Scenario 4: Validation Tests

#### Test: Cannot refund non-cancelled order
```
POST /buyer/orders/64a1111111111111111111111/refund-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "Just testing",
  "details": ""
}
Expectation: 400 Bad Request
Message: "Refund request can only be made for cancelled orders"
```

#### Test: Cannot return non-delivered order
```
POST /buyer/orders/64a2222222222222222222222/return-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "Just testing",
  "details": ""
}
Expectation: 400 Bad Request
Message: "Return request can only be made for delivered orders"
```

#### Test: Cannot request without reason
```
POST /buyer/orders/64a1234567890abcdef12345/refund-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "",
  "details": "Some details"
}
Expectation: 400 Bad Request
Message: "Reason is required for refund request"
```

#### Test: Cannot request for other user's order
```
POST /buyer/orders/64a1234567890abcdef12345/refund-request
Headers: Authorization: Bearer <different_buyer_token>
Body:
{
  "reason": "This is not my order",
  "details": ""
}
Expectation: 403 Forbidden
Message: "You can only request refund for your own orders"
```

#### Test: Cannot double-request (duplicate pending)
```
POST /buyer/orders/64a1234567890abcdef12345/refund-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "First request"
}
Response: 201 Created

POST /buyer/orders/64a1234567890abcdef12345/refund-request
Headers: Authorization: Bearer <buyer_token>
Body:
{
  "reason": "Second request"
}
Expectation: 400 Bad Request
Message: "A refund request already exists with status: pending"
```

#### Test: Cannot review without proper action
```
PATCH /vendor/orders/64a1234567890abcdef12345/refund-request/review
Headers: Authorization: Bearer <vendor_token>
Body:
{
  "action": "invalid",
  "response": ""
}
Expectation: 400 Bad Request
Message: "Action must be either 'approved' or 'rejected'"
```

#### Test: Must provide response when rejecting
```
PATCH /vendor/orders/64a1234567890abcdef12345/refund-request/review
Headers: Authorization: Bearer <vendor_token>
Body:
{
  "action": "rejected",
  "response": ""
}
Expectation: 400 Bad Request
Message: "Response message is required when rejecting refund request"
```

#### Test: Vendor cannot review other vendor's order
```
PATCH /vendor/orders/64a3333333333333333333333/refund-request/review
Headers: Authorization: Bearer <different_vendor_token>
Body:
{
  "action": "approved",
  "response": ""
}
Expectation: 404 Not Found
Message: "Order not found or you do not have permission"
```

---

## Postman Collection URLs

### Buyer Endpoints
1. **Request Refund**
   - Method: POST
   - URL: `http://localhost:PORT/buyer/orders/{orderId}/refund-request`
   - Headers: `Authorization: Bearer {token}`
   - Body: `{"reason": "...", "details": "..."}`

2. **Request Return**
   - Method: POST
   - URL: `http://localhost:PORT/buyer/orders/{orderId}/return-request`
   - Headers: `Authorization: Bearer {token}`
   - Body: `{"reason": "...", "details": "..."}`

### Vendor Endpoints
3. **Get Refund Requests**
   - Method: GET
   - URL: `http://localhost:PORT/vendor/orders/refund-requests`
   - Headers: `Authorization: Bearer {vendor_token}`

4. **Get Return Requests**
   - Method: GET
   - URL: `http://localhost:PORT/vendor/orders/return-requests`
   - Headers: `Authorization: Bearer {vendor_token}`

5. **Review Refund Request**
   - Method: PATCH
   - URL: `http://localhost:PORT/vendor/orders/{orderId}/refund-request/review`
   - Headers: `Authorization: Bearer {vendor_token}`
   - Body: `{"action": "approved/rejected", "response": "..."}`

6. **Review Return Request**
   - Method: PATCH
   - URL: `http://localhost:PORT/vendor/orders/{orderId}/return-request/review`
   - Headers: `Authorization: Bearer {vendor_token}`
   - Body: `{"action": "approved/rejected", "response": "..."}`

---

## Summary of Changes

### Files Changed: 5
1. ✅ `models/buyerOrder.model.js`
2. ✅ `controllers/buyer.controller.js`
3. ✅ `controllers/vendor.controller.js`
4. ✅ `routes/buyer.route.js`
5. ✅ `routes/vendor.route.js`

### New Fields Added: 3
1. ✅ `cancelledBy` - Tracks who cancelled order
2. ✅ `refundRequest` - Manages refund workflow
3. ✅ `returnRequest` - Manages return workflow

### New Controller Functions: 6
1. ✅ `requestRefund()` - Buyer initiates refund
2. ✅ `requestReturn()` - Buyer initiates return
3. ✅ `getRefundRequests()` - Vendor views refunds
4. ✅ `getReturnRequests()` - Vendor views returns
5. ✅ `reviewRefundRequest()` - Vendor reviews refund
6. ✅ `reviewReturnRequest()` - Vendor reviews return

### New API Endpoints: 6
1. ✅ POST `/buyer/orders/:orderId/refund-request`
2. ✅ POST `/buyer/orders/:orderId/return-request`
3. ✅ GET `/vendor/orders/refund-requests`
4. ✅ GET `/vendor/orders/return-requests`
5. ✅ PATCH `/vendor/orders/:orderId/refund-request/review`
6. ✅ PATCH `/vendor/orders/:orderId/return-request/review`

### Business Rules Implemented: 13+
- ✅ Refund only for cancelled orders
- ✅ Refund only if cancelled by buyer
- ✅ Return only for delivered orders
- ✅ Order ownership validation
- ✅ Vendor ownership validation
- ✅ Reason required fields
- ✅ No duplicate requests
- ✅ Review action validation
- ✅ Response required on rejection
- ✅ Status workflow validation
- ✅ JWT token validation
- ✅ Complete audit logging
- ✅ Proper error handling
