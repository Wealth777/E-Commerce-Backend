# Product Rating and Review System - Documentation

## System Overview
CampusTrade's rating and review system is a dual-component architecture that separates **ratings** (numerical scores) from **reviews** (textual feedback). This allows buyers to rate products independently or link their reviews to ratings. The system includes comprehensive moderation capabilities for platform administrators (Founders).

---

## 1. Data Models

### 1.1 ProductRating Model
**Location**: `models/productRating.model.js`

```javascript
{
  product: ObjectId (ref: AddProduct) - The rated product [REQUIRED, INDEXED]
  buyer: ObjectId (ref: Buyer) - The rating buyer [REQUIRED, INDEXED]
  vendor: ObjectId (ref: Vendor) - The product vendor [REQUIRED]
  order: ObjectId (ref: Order) - Associated order [OPTIONAL]
  rating: Number (1-5) - Rating score [REQUIRED, VALIDATED]
  comment: String (max 500 chars) - Optional comment [OPTIONAL]
  status: String (enum: active|hidden|deleted) - Rating visibility [DEFAULT: active]
  timestamps: createdAt, updatedAt [AUTO]
}
```

**Key Features**:
- Unique constraint: One rating per buyer per product (enforced via unique index with soft delete support)
- Soft delete plugin for data retention
- Indexed on `product` and `createdAt` for efficient queries
- Stores vendor reference for analytics

---

### 1.2 Review Model
**Location**: `models/review.model.js`

```javascript
{
  reviewer: ObjectId (polymorphic) - Can be Buyer, Vendor, or Founder [REQUIRED, INDEXED]
  reviewerModel: String (enum: Buyer|Vendor|Founder) - Specifies reviewer type [DEFAULT: Buyer]
  reviewerRole: String (enum: buyer|vendor|founder|admin) - User's role [REQUIRED]
  vendor: ObjectId (ref: Vendor) - Product vendor [INDEXED]
  product: ObjectId (ref: AddProduct) - Reviewed product [INDEXED]
  order: ObjectId (ref: Order) - Associated order [OPTIONAL]
  rating: ObjectId (ref: ProductRating) - Linked rating [OPTIONAL]
  ratingValue: Number (1-5) - Numerical rating (1-5) [OPTIONAL]
  comment: String (max 2000 chars) - Review text [REQUIRED]
  status: String (enum: active|hidden|flagged|deleted) - Review state [DEFAULT: active]
  moderatedAt: Date - When moderation occurred
  moderatedBy: ObjectId (ref: Founder) - Admin who moderated
  moderationReason: String - Why the review was moderated
  timestamps: createdAt, updatedAt [AUTO]
}
```

**Key Features**:
- Polymorphic reviewer field (supports Buyer, Vendor, Founder feedback)
- Can exist independently or linked to ProductRating
- Unique constraint: One review per reviewer per product
- Moderation audit trail with reason tracking
- Soft delete plugin for data retention

---

## 2. Workflow

### 2.1 Buyer Rating Workflow

```
1. VERIFICATION
   ├─ Buyer attempts to rate a product
   ├─ System verifies:
   │  ├─ Product exists
   │  ├─ Buyer is not the vendor (self-rating prevention)
   │  └─ Buyer purchased from delivered order (if `canVerifyPurchase = true`)
   └─ If verification fails → 403 Forbidden error

2. CREATION
   ├─ Check if rating already exists
   ├─ If exists and not deleted → 409 Conflict (update instead)
   ├─ Create new ProductRating record
   └─ Create AuditLog entry

3. AGGREGATION
   ├─ Call refreshProductRatingSummary()
   ├─ Recalculate:
   │  ├─ Average rating (0.00 - 5.00)
   │  ├─ Total ratings count
   │  └─ Breakdown by score (1,2,3,4,5)
   └─ Update Product.ratingSummary

4. RESULT
   └─ Return created rating with product/vendor details
```

### 2.2 Buyer Review Workflow

```
1. VERIFICATION (Same as ratings + additional checks)
   ├─ Product exists
   ├─ Order delivered validation
   ├─ Check if review already exists for this product
   └─ If exists and not deleted → 409 Conflict

2. LINKING (Optional)
   ├─ If buyer provides ratingId:
   │  ├─ Verify rating belongs to same buyer and product
   │  ├─ Link review to rating
   │  └─ Use rating's ratingValue if provided
   └─ Otherwise: Use provided ratingValue or null

3. CREATION
   ├─ Create Review record with:
   │  ├─ Reviewer: buyer._id
   │  ├─ ReviewerModel: 'Buyer'
   │  ├─ ReviewerRole: 'buyer'
   │  └─ Vendor reference for vendor analytics
   └─ Create AuditLog entry

4. RESULT
   └─ Return created review with all relationships populated
```

### 2.3 Update Workflow (Buyer)

```
Ratings:
  ├─ Find rating by ID and buyer ownership
  ├─ Update rating value and/or comment
  ├─ Reset status to 'active'
  ├─ Recalculate product ratingSummary
  └─ Log update action

Reviews:
  ├─ Find review by ID and reviewer ownership
  ├─ Update comment and/or ratingValue
  ├─ Reset status to 'active'
  └─ Log update action
```

### 2.4 Delete Workflow (Soft Delete)

```
User-initiated deletion:
  ├─ Mark status: 'deleted'
  ├─ Set deleted: true, deletedAt: timestamp, deletedBy: userId
  ├─ Recalculate aggregations (for ratings)
  └─ Log deletion with user reference

Admin moderation:
  ├─ Founder can hide/restore/delete reviews
  ├─ Set status: 'hidden'|'active'|'deleted'
  ├─ Record moderationAt, moderatedBy, moderationReason
  ├─ Mark deleted fields if status='deleted'
  └─ Log moderation action with reason
```

### 2.5 Moderation Workflow (Founder/Admin Only)

```
HIDE Review:
  ├─ PATCH /founder/reviews/:reviewId/hide
  ├─ Set status: 'hidden'
  ├─ Record moderation metadata
  └─ AuditLog: REVIEW_HIDDEN

RESTORE Review:
  ├─ PATCH /founder/reviews/:reviewId/restore
  ├─ Set status: 'active'
  ├─ Clear deleted fields
  ├─ Record moderation metadata
  └─ AuditLog: REVIEW_RESTORED

DELETE Review (Permanent):
  ├─ DELETE /founder/reviews/:reviewId
  ├─ Set status: 'deleted', deleted: true
  ├─ Record moderation metadata
  └─ AuditLog: REVIEW_SOFT_DELETED
```

---

## 3. Routes & Endpoints

### 3.1 Buyer Routes (`routes/buyer.route.js`)

| Method | Route | Auth | Controller | Purpose |
|--------|-------|------|-----------|---------|
| POST | `/products/:productId/ratings` | buyer | `createProductRating` | Create product rating |
| PATCH | `/ratings/:ratingId` | buyer | `updateProductRating` | Update own rating |
| DELETE | `/ratings/:ratingId` | buyer | `deleteOwnProductRating` | Delete own rating |
| GET | `/products/:productId/ratings` | public | `getProductRatings` | Get all active ratings for product |
| GET | `/products/:productId/ratings/summary` | public | `getProductRatingSummary` | Get rating summary + latest ratings |
| GET | `/ratings/me` | buyer | `getBuyerRatings` | Get all ratings created by buyer |
| POST | `/products/:productId/reviews` | buyer | `createReview` | Create product review |
| PATCH | `/reviews/:reviewId` | buyer | `updateOwnReview` | Update own review |
| DELETE | `/reviews/:reviewId` | buyer | `deleteOwnReview` | Delete own review |
| GET | `/products/:productId/reviews` | public | `getProductReviews` | Get all active reviews for product |
| GET | `/reviews/me` | buyer | `getBuyerReviews` | Get all reviews created by buyer |

---

### 3.2 Vendor Routes (`routes/vendor.route.js`)

| Method | Route | Auth | Controller | Purpose |
|--------|-------|------|-----------|---------|
| GET | `/ratings/products` | vendor | `getVendorProductRatings` | Get ratings for vendor's products |
| GET | `/reviews/me` | vendor | `getVendorReviews` | Get reviews for vendor's products |
| GET | `/reviews/vendor/:vendorId` | public | `getVendorReviews` | Get reviews for specific vendor |

---

### 3.3 Founder Routes (`routes/founder.route.js`)

| Method | Route | Auth | Controller | Purpose |
|--------|-------|------|-----------|---------|
| GET | `/reviews` | founder+ | `founderGetAllReviews` | Fetch all reviews (paginated, filterable) |
| PATCH | `/reviews/:reviewId/hide` | founder+ | `founderHideReview` | Hide a review from public display |
| PATCH | `/reviews/:reviewId/restore` | founder+ | `founderRestoreReview` | Restore hidden review |
| DELETE | `/reviews/:reviewId` | founder | `founderDeleteReview` | Permanently delete a review |

---

## 4. Implementation Details

### 4.1 Service Layer - Rating Service (`services/productRating.service.js`)

**Key Functions**:

```javascript
createRating({ buyerId, productId, body })
  └─ Validates product & vendor ownership
  └─ Verifies purchase (if enabled)
  └─ Prevents duplicate active ratings
  └─ Creates record and refreshes summary

updateRating({ buyerId, ratingId, body })
  └─ Validates buyer ownership
  └─ Updates rating/comment fields
  └─ Refreshes product summary

deleteOwnRating({ buyerId, ratingId })
  └─ Soft deletes with audit trail
  └─ Refreshes aggregated summary

getProductRatings(productId, query)
  └─ Returns active ratings paginated
  └─ Populates: buyer, product, vendor

getProductRatingSummary(productId)
  └─ Recalculates: average, total, breakdown
  └─ Includes 5 latest ratings
  └─ Updates Product.ratingSummary

getBuyerRatings(buyerId, query)
  └─ All ratings created by specific buyer

getVendorProductRatings(vendorId, query)
  └─ All ratings for vendor's products

refreshProductRatingSummary(productId)
  ├─ Aggregates ratings by score
  ├─ Calculates average (to 2 decimals)
  └─ Updates Product document
```

**Aggregation Pipeline for Summary**:
```javascript
// Matches active, non-deleted ratings
// Groups by rating value
// Calculates count per score
// Updates Product with: { ratingSummary: { averageRating, totalRatings, breakdown } }
```

---

### 4.2 Service Layer - Review Service (`services/review.service.js`)

**Key Functions**:

```javascript
createReview({ buyerId, productId, body })
  └─ Verifies purchase delivery
  └─ Prevents duplicate active reviews
  └─ Optionally links to existing rating
  └─ Creates audit entry

updateOwnReview({ userId, reviewId, body })
  └─ Validates ownership
  └─ Updates comment/ratingValue
  └─ Resets status to active

deleteOwnReview({ userId, reviewId })
  └─ Soft deletes with audit trail
  └─ Marks deleted=true, deletedBy=userId

getProductReviews(productId, query)
  └─ Returns active reviews paginated
  └─ Supports search in comments

getVendorReviews(vendorId, query)
  └─ Reviews for specific vendor's products

getBuyerReviews(buyerId, query)
  └─ All reviews created by buyer

founderGetAllReviews(query)
  └─ All reviews with any status
  └─ Supports filtering by status, date, search

moderateReview({ reviewId, actor, status, reason })
  ├─ status='hidden': Hide from public
  ├─ status='active': Restore review
  ├─ status='deleted': Soft delete
  └─ Records moderation metadata
```

---

### 4.3 Controller Layer - Rating Controller (`controllers/common/rating.controller.js`)

```javascript
exports.createProductRating      // POST /products/:productId/ratings
exports.updateProductRating      // PATCH /ratings/:ratingId
exports.deleteOwnProductRating   // DELETE /ratings/:ratingId
exports.getProductRatings        // GET /products/:productId/ratings
exports.getProductRatingSummary  // GET /products/:productId/ratings/summary
exports.getBuyerRatings          // GET /ratings/me
exports.getVendorProductRatings  // GET /ratings/products (vendor)
```

All follow same error handling pattern:
- Extract data from req (user, params, query, body)
- Call service method
- Return via `sendSuccess()` or `sendError()`
- Log errors via logger

---

### 4.4 Controller Layer - Review Controller (`controllers/common/review.controller.js`)

```javascript
exports.createReview             // POST /products/:productId/reviews
exports.updateOwnReview          // PATCH /reviews/:reviewId
exports.deleteOwnReview          // DELETE /reviews/:reviewId
exports.getProductReviews        // GET /products/:productId/reviews
exports.getVendorReviews         // GET /reviews/me (vendor) or /reviews/vendor/:vendorId (public)
exports.getBuyerReviews          // GET /reviews/me
exports.founderGetAllReviews     // GET /founder/reviews
exports.founderHideReview        // PATCH /founder/reviews/:reviewId/hide
exports.founderRestoreReview     // PATCH /founder/reviews/:reviewId/restore
exports.founderDeleteReview      // DELETE /founder/reviews/:reviewId
```

---

## 5. Key Content & Business Logic

### 5.1 Constraints & Validations

| Constraint | Type | Applied At | Error |
|-----------|------|-----------|-------|
| One rating/buyer/product | Unique Index | DB Level | 409 Conflict |
| One review/reviewer/product | Unique Index | DB Level | 409 Conflict |
| Rating score 1-5 | Schema Validation | Model | Validation Error |
| Rating max 500 chars | Schema Validation | Model | Validation Error |
| Review max 2000 chars | Schema Validation | Model | Validation Error |
| Self-rating prevention | Business Logic | Service | 403 Forbidden |
| Purchase verification | Business Logic | Service | 403 Forbidden |
| Buyer ownership (delete/update) | Business Logic | Service | 404 Not Found |
| Founder-only moderation | Route Middleware | Router | 403 Forbidden |

---

### 5.2 Data Aggregation

**Product Rating Summary Structure**:
```javascript
Product.ratingSummary = {
  averageRating: 4.35,          // float to 2 decimals
  totalRatings: 156,             // count
  breakdown: {
    1: 5,    // 1-star count
    2: 8,    // 2-star count
    3: 15,   // 3-star count
    4: 62,   // 4-star count
    5: 66    // 5-star count
  }
}
```

**Calculation**: `average = sum(rating * count) / totalRatings`

---

### 5.3 Audit Logging

All rating/review actions logged to `AuditLog`:

```javascript
{
  user: buyerId/vendorId,
  userModel: 'Buyer'|'Vendor'|'Founder',
  role: 'buyer'|'vendor'|'founder',
  actor: userId,
  action: 'RATING_CREATED'|'RATING_UPDATED'|'RATING_DELETED'|
          'REVIEW_CREATED'|'REVIEW_UPDATED'|'REVIEW_DELETED'|
          'REVIEW_HIDDEN'|'REVIEW_RESTORED'|'REVIEW_SOFT_DELETED',
  entity: 'ProductRating'|'Review',
  entityId: recordId,
  metadata: { product, rating, reason }
}
```

---

### 5.4 Soft Delete Strategy

- **Initial deletion**: `deleted: false` (default)
- **User deletes**: `deleted=true, deletedAt=now(), deletedBy=userId, deletedByModel='Buyer'`
- **Founder action**: `deleted=true, deletedAt=now(), deletedBy=founderId, deletedByModel='Founder'`
- **Queries**: Automatically exclude deleted records via `deleted: { $ne: true }` filter
- **Restoration**: Set `deleted=false` when restoring (founder only)

---

## 6. Query Features

### 6.1 Filtering Support

**Ratings Filter**:
```javascript
filter = {
  productId,           // Optional
  buyerId,             // Optional
  vendorId,            // Optional
  status,              // Optional: active|hidden|deleted
  rating,              // Optional: numeric score
  dateRange            // Optional: startDate/endDate
}
```

**Reviews Filter**:
```javascript
filter = {
  productId,           // Optional
  vendorId,            // Optional
  reviewerId,          // Optional
  status,              // Optional: active|hidden|flagged|deleted
  ratingValue,         // Optional: numeric score
  search,              // Optional: regex search in comments
  dateRange            // Optional: startDate/endDate
}
```

### 6.2 Pagination

All list endpoints support:
```javascript
query = {
  page: 1,             // Default: 1
  limit: 10,           // Default: 10, max customizable
  sort: 'createdAt'    // Default: -1 (newest first)
}
```

---

## 7. Status States

### 7.1 Rating Status
- **active**: Visible to public, included in aggregations
- **hidden**: Not visible but exists in database
- **deleted**: Soft deleted (included in DB but filtered in queries)

### 7.2 Review Status
- **active**: Visible to public
- **hidden**: Hidden by admin, not visible to public
- **flagged**: Marked for review/concern
- **deleted**: Soft deleted (soft delete plugin manages this)

---

## 8. Security & Authorization

### Buyer Level
- Can create/update/delete only own ratings and reviews
- Cannot rate/review own products (vendor check)
- Must have verified purchase (if enabled)

### Vendor Level
- Read-only: View ratings/reviews for own products
- Cannot moderate (no delete/hide capability)
- Cannot see buyer details in moderation

### Founder/Admin Level
- Full moderation: Hide, restore, permanently delete reviews
- Can see all reviews regardless of status
- Records moderation reason and timestamp
- Cannot delete ratings (only reviews)

---

## 9. API Response Structure

**Success Response**:
```javascript
{
  success: true,
  status: 201|200,
  message: "Product rating created successfully",
  data: { /* rating/review object */ }
}
```

**Error Response**:
```javascript
{
  success: false,
  status: 403|404|409|500,
  message: "You cannot rate your own product",
  errors: null
}
```

---

## 10. Integration Points

### Dependencies
- **Product Model**: For rating summary storage and vendor reference
- **Order Model**: For purchase verification
- **AuditLog**: For action tracking
- **Buyer/Vendor Models**: For reviewer info population

### Triggers
- Rating creation → Product ratingSummary recalculation
- Rating update → Product ratingSummary recalculation
- Rating deletion → Product ratingSummary recalculation

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Models** | ProductRating, Review |
| **Main Services** | productRating.service.js, review.service.js |
| **Controllers** | rating.controller.js, review.controller.js |
| **Routes** | buyer.route.js, vendor.route.js, founder.route.js |
| **Key Validation** | Purchase verification, self-rating prevention, uniqueness |
| **Aggregation** | Real-time rating summary calculation |
| **Moderation** | Founder-level review hide/restore/delete with audit trail |
| **Data Retention** | Soft delete with full audit history |
| **Permissions** | Buyer (create/update/delete own), Vendor (read), Founder (moderate) |
