# GMC Backend - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Project Structure](#project-structure)
3. [Database Design](#database-design)
4. [User System & Roles](#user-system--roles)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Routes](#api-routes)
7. [Controllers & Business Logic](#controllers--business-logic)
8. [Middleware](#middleware)
9. [Data Flow](#data-flow)
10. [Security Practices](#security-practices)
11. [Setup & Installation](#setup--installation)

---

## 🎯 Project Overview

**GMC** is a multi-vendor e-commerce platform designed specifically for students. It enables:
- **Buyers**: Students who can browse, search, add to cart, and purchase products
- **Vendors**: Students who can list products and manage their stores
- **Founders**: Admin users who manage the platform

### Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcrypt
- **File Storage**: Cloudinary (CDN)
- **Image Upload**: Multer + Multer-Storage-Cloudinary
- **Email**: Nodemailer (for notifications)

---

## 📁 Project Structure

```
backend/
├── app.js                           # Express app configuration
├── index.js                         # Server entry point
├── package.json                     # Dependencies
├── README.md                        # Project info
│
├── config/
│   └── cloudinary.js               # Cloudinary configuration for image uploads
│
├── controllers/
│   ├── auth.controller.js          # Authentication logic (to be implemented)
│   ├── buyer.controller.js         # Buyer business logic
│   ├── founder.controller.js       # Founder/Admin logic
│   └── vendor.controller.js        # Vendor business logic
│
├── middleware/
│   ├── imageUpload.js              # Multer configuration for file uploads
│   └── verifyUser.js               # JWT verification middleware
│
├── models/
│   ├── addproduct.model.js         # Product schema
│   ├── addToCart.model.js          # Cart schema
│   ├── auditLog.js                 # Activity logging schema
│   ├── buyer.model.js              # Buyer user schema
│   ├── buyerOrder.model.js         # Order schema
│   ├── founder.model.js            # Founder/Admin schema
│   ├── serialCounter.model.js      # Serial number generator schema
│   └── vendor.model.js             # Vendor user schema
│
├── routes/
│   ├── buyer.route.js              # Buyer endpoints
│   ├── founder.route.js            # Founder endpoints
│   └── vendor.route.js             # Vendor endpoints
│
└── utils/
    ├── generateSerial.js           # Serial number generation utility
    └── location.js                 # Country and state data
```

### Why Each Folder Exists

| Folder | Purpose | Contains |
|--------|---------|----------|
| **config/** | Centralized configuration | Database, API keys, third-party services |
| **controllers/** | Business logic | Request handling, validation, database operations |
| **middleware/** | Request processing | Authentication, file uploads, error handling |
| **models/** | Data schemas | MongoDB schemas using Mongoose |
| **routes/** | API endpoints | URL paths and HTTP methods |
| **utils/** | Reusable utilities | Helper functions, data generators |

---

## 🗄️ Database Design (MongoDB)

### 1. **User Model - Buyer**

```javascript
{
  serialNumber: String (unique),      // Generated unique ID
  fullName: String (required),
  email: String (required, unique),
  phoneNo: String (required, unique),
  password: String (required),        // Hashed with bcrypt
  
  username: String,
  profilePhoto: String,               // Cloudinary URL
  country: String,
  state: String,
  
  preferredLanguage: String,
  notificationPreference: String,     // 'whatsapp', 'email', 'both'
  updatedAt: Date
}
```

**Key Fields:**
- `serialNumber`: Unique identifier for audit trails
- `password`: Never stored in plain text (hashed with bcrypt)
- `profilePhoto`: Stored as Cloudinary URL (secure CDN)

---

### 2. **User Model - Vendor**

```javascript
{
  serialNumber: String (unique),
  fullName: String (required),
  email: String (required, unique),
  phoneNo: String (required, unique),
  password: String (required),        // Hashed with bcrypt
  
  // Profile Information
  username: String,
  profilePhoto: String,               // Cloudinary URL
  country: String,
  state: String,
  address: String,
  
  // Store Information
  storeName: String,
  storeDescription: String,
  bannerImage: String,                // Cloudinary URL
  
  // Contact & Social
  supportContact: String,
  socialLinks: {
    facebook: String,
    instagram: String,
    x: String
  },
  
  // Payment Information
  bankName: String,
  accountName: String,
  accountNumber: String,
  
  // Preferences
  preferredLanguage: String,
  notificationPreference: String,
  updatedAt: Date
}
```

**Key Fields:**
- `storeName`: Identifies the vendor's shop
- `bankDetails`: For payout processing
- `socialLinks`: For store promotion
- `profilePhoto` + `bannerImage`: Brand identity

---

### 3. **User Model - Founder**

```javascript
{
  serialNumber: String (unique),
  firstName: String (required),
  lastName: String (required),
  email: String (required, unique),
  phoneNo: String (required, unique),
  password: String (required)         // Hashed with bcrypt
}
```

---

### 4. **Product Model**

```javascript
{
  vendor: ObjectId,                   // References Vendor model
  name: String (required),
  description: String (required),
  image: String (required),           // Cloudinary URL
  category: String (required),
  
  status: String,                     // 'in-stock', 'low-in-stock', 'out-of-stock'
  price: Number (required, min: 0),
  originalPrice: Number (required),   // For discount calculations
  stock: Number (required),           // Quantity available
  
  timestamps: true                    // createdAt, updatedAt automatic
}
```

**Relationships:**
- One Vendor has Many Products
- Product belongs to one Vendor

---

### 5. **Cart Model**

```javascript
{
  user: ObjectId,                     // References Buyer model (unique per buyer)
  items: [
    {
      product: ObjectId,              // References Product model
      quantity: Number (default: 1)
    }
  ],
  timestamps: true
}
```

**Relationships:**
- One Buyer has One Cart
- One Cart has Many Products (through items array)
- Many Products (from different vendors) can be in one cart

---

### 6. **Order Model** (To be implemented)

```javascript
{
  buyer: ObjectId,                    // References Buyer
  items: [
    {
      product: ObjectId,              // References Product
      vendor: ObjectId,               // References Vendor
      quantity: Number,
      price: Number,                  // Price at time of purchase
      subtotal: Number
    }
  ],
  
  totalPrice: Number,
  status: String,                     // 'pending', 'processing', 'shipped', 'delivered'
  paymentStatus: String,              // 'unpaid', 'paid'
  paymentMethod: String,              // 'card', 'bank_transfer', 'wallet'
  
  shippingAddress: {
    fullName: String,
    phoneNo: String,
    address: String,
    city: String,
    state: String,
    country: String
  },
  
  timestamps: true
}
```

---

### 7. **Review Model** (To be implemented)

```javascript
{
  product: ObjectId,                  // References Product
  buyer: ObjectId,                    // References Buyer
  vendor: ObjectId,                   // References Vendor
  
  rating: Number (1-5),
  comment: String,
  
  verified: Boolean,                  // Only verified buyers can review
  helpful: Number,                    // Vote count
  
  timestamps: true
}
```

---

### 8. **Audit Log Model**

```javascript
{
  user: ObjectId,                     // References User
  role: String,                       // 'buyer', 'vendor', 'founder'
  action: String,                     // 'REGISTER_ACCOUNT', 'LOG_IN', 'UPDATE_ACCOUNT'
  entity: String,                     // 'Buyer', 'Vendor', 'Cart', 'Product'
  entityId: ObjectId,                 // ID of affected entity
  
  metadata: Object,                   // Additional context
  {
    email: String,
    serialNumber: String,
    phoneNo: String
  },
  
  timestamp: Date (auto)
}
```

---

### Database Relationships Diagram

```
┌─────────────┐          ┌──────────────┐
│   Buyer     │────────→│    Cart      │
│             │ 1:1      │              │
└─────────────┘          └──────────────┘
                                │
                                │ contains
                                ↓
                         ┌──────────────┐
                         │   Product    │
                         │              │
                         └──────────────┘
                                ↑
                                │ listed by
                                │
┌──────────────┐               │
│   Vendor     │───────────────┘
│              │
└──────────────┘

Buyer ──→ Places ──→ Order ──→ Contains ──→ Product
                                             ↑
                                             │
                                           Vendor

Product ←──── Reviews ──────→ Buyer
         ←──── Reviews ──────→ Vendor

All Users ──→ Generate ──→ AuditLog
```

---

## 👥 User System & Roles

### Three User Types

#### 1. **Buyer**
- Can register and login
- Can view all products
- Can manage their cart
- Can place orders
- Can leave reviews
- Can view order history

#### 2. **Vendor**
- Can register and login
- Can add/edit/delete products
- Can view products they listed
- Can see sales analytics
- Can configure payout details
- Can view activity logs

#### 3. **Founder**
- Admin/Manager role
- Can manage platform
- Can view user analytics
- Can manage vendors

### How Roles Are Stored

**Method 1: Collection-Based** (Current Implementation)
- Buyers stored in `Buyer` collection
- Vendors stored in `Vendor` collection
- Founders stored in `Founder` collection
- Each collection is separate

```
Database
├── Buyer (collection)
│   └── Multiple buyer documents
├── Vendor (collection)
│   └── Multiple vendor documents
└── Founder (collection)
    └── Multiple founder documents
```

**Advantages:**
- Clean separation of concerns
- Role-specific fields without NULL values
- Simpler queries for role-specific data

**How System Distinguishes Users:**
- Login endpoint identifies which collection the user exists in
- JWT token stores user ID only (role inferred from query context)
- Routes organized by role (`/api/buyer`, `/api/vendor`, `/api/founder`)

---

## 🔐 Authentication & Authorization

### 1. **JWT Token Flow**

```
User Registration
    ↓
Hash Password (bcrypt)
    ↓
Save User to Database
    ↓
Login with Email + Password
    ↓
Compare Password (bcrypt.compare)
    ↓
Generate JWT Token
    ↓
Return Token to Client
    ↓
Client Stores Token (localStorage)
    ↓
Client Sends Token in Authorization Header
    ↓
Backend Verifies Token
    ↓
Grant Access to Protected Routes
```

### 2. **JWT Implementation**

```javascript
// Token Generation
const token = jwt.sign(
  { id: user._id },              // Payload (user ID)
  process.env.JWT_KEY,           // Secret key
  { expiresIn: "7d" }            // Expiration
);

// Token Verification
const decoded = jwt.verify(token, process.env.JWT_KEY);
// Returns: { id: "user_id", iat: timestamp, exp: timestamp }
```

### 3. **Middleware: Token Verification**

```javascript
const verifyUser = (req, res, next) => {
  try {
    // Extract token from 'Bearer <token>' format
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Attach user info to request object
    req.user._id = decoded.id;
    
    next(); // Proceed to next middleware/controller
    
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
```

**Usage in Routes:**
```javascript
router.get('/profile/me', verifyUser, getUsersDetails);
//                         ↑ Middleware runs first, checks token
//                            If valid, calls getUsersDetails
```

### 4. **Protected Route Workflow**

```
Request with Token
    ↓
verifyUser Middleware
    ├─ Token exists? ✓
    ├─ Token valid? ✓
    └─ Attach user ID to req.user._id ✓
    ↓
Controller receives (req, res)
    ├─ req.user._id available
    ├─ Fetch user data from database
    └─ Return user-specific data
    ↓
Response
```

### 5. **Password Hashing with bcrypt**

```javascript
// Registration - Hash password
const hashPassword = await bcrypt.hash(password, 10);
// Stores hash like: $2b$10$abcdef123456...

// Login - Compare passwords
const isValid = await bcrypt.compare(plainPassword, hashPassword);
// Returns true/false without revealing the hash

// Why bcrypt?
// - One-way hashing (cannot be reversed)
// - Salt generation (prevents rainbow table attacks)
// - Slow computation (brute force resistant)
```

---

## 🛣️ API Routes

### **Base URL**: `http://localhost:PORT/api`

### **Buyer Routes** (`/api/buyer`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register` | ❌ | Register new buyer account |
| POST | `/auth/login` | ❌ | Login and get JWT token |
| GET | `/profile/me` | ✅ | Get buyer's profile details |
| PUT | `/profile/me` | ✅ | Update profile (with image upload) |
| POST | `/cart/add` | ✅ | Add product to cart |
| GET | `/cart/` | ✅ | View cart with all items |
| PUT | `/cart/update` | ✅ | Update item quantity in cart |
| DELETE | `/cart/:productId` | ✅ | Remove item from cart |

#### Buyer Route Details

**POST /auth/register**
```
Request Body:
{
  "fullName": "John Doe",
  "email": "john@student.com",
  "phoneNo": "+234801234567",
  "password": "SecurePassword123"
}

Response:
{
  "success": true,
  "message": "🎉 User Account Created Successfully!"
}
```

**POST /auth/login**
```
Request Body:
{
  "email": "john@student.com",
  "password": "SecurePassword123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**GET /profile/me** (Protected)
```
Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Response:
{
  "success": true,
  "data": {
    "identity": {
      "id": "507f1f77bcf86cd799439011",
      "serialNumber": "BUY001",
      "username": "johndoe",
      "fullName": "John Doe",
      "profilePhoto": "https://..."
    },
    "contact": {
      "email": "john@student.com",
      "phoneNo": "+234801234567"
    },
    "location": {
      "country": "Nigeria",
      "state": "Lagos"
    },
    "preferences": {
      "preferredLanguage": "English",
      "notificationPreferences": "both"
    }
  }
}
```

**POST /cart/add** (Protected)
```
Request Body:
{
  "productId": "507f1f77bcf86cd799439012",
  "quantity": 2
}

Response:
{
  "success": true,
  "message": "Product added to cart",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "user": "507f1f77bcf86cd799439011",
    "items": [
      {
        "product": "507f1f77bcf86cd799439012",
        "quantity": 2
      }
    ]
  }
}
```

**GET /cart/** (Protected)
```
Response:
{
  "success": true,
  "data": {
    "items": [
      {
        "product": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Laptop",
          "price": 150000,
          "image": "https://...",
          "vendor": {
            "_id": "507f1f77bcf86cd799439014",
            "storeName": "TechStore"
          }
        },
        "quantity": 2
      }
    ]
  }
}
```

---

### **Vendor Routes** (`/api/vendor`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register` | ❌ | Register new vendor account |
| POST | `/auth/login` | ❌ | Login and get JWT token |
| GET | `/profile/me` | ✅ | Get vendor's profile |
| PUT | `/profile/me` | ✅ | Update profile with images |
| POST | `/product/add` | ✅ | Create new product (image upload) |
| GET | `/product/vendor` | ✅ | Get vendor's own products |
| GET | `/product/all` | ❌ | Get all products (public) |
| PUT | `/product/:id` | ✅ | Update product |
| DELETE | `/product/:id` | ✅ | Delete product |
| POST | `/payout` | ✅ | Configure payout details |
| POST | `/analytics` | ✅ | Get sales analytics |
| GET | `/activity` | ✅ | Get activity logs |

#### Vendor Route Details

**POST /product/add** (Protected, Image Upload)
```
Headers:
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
{
  "name": "Gaming Laptop",
  "description": "High-performance laptop for gaming",
  "category": "Electronics",
  "price": 150000,
  "originalPrice": 200000,
  "stock": 5,
  "image": <file>
}

Response:
{
  "success": true,
  "message": "Product added successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "vendor": "507f1f77bcf86cd799439014",
    "name": "Gaming Laptop",
    "price": 150000,
    "image": "https://cloudinary.com/...",
    "stock": 5,
    "status": "in-stock"
  }
}
```

**GET /product/all** (Public)
```
Response:
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Gaming Laptop",
      "price": 150000,
      "vendor": {
        "_id": "507f1f77bcf86cd799439014",
        "storeName": "TechStore"
      },
      "image": "https://..."
    }
  ]
}
```

---

### **Founder Routes** (`/api/founder`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register` | ❌ | Register founder account |
| POST | `/auth/login` | ❌ | Login and get JWT token |
| GET | `/get/me` | ✅ | Get founder profile |

---

## 🎮 Controllers & Business Logic

### **Buyer Controller** (`buyer.controller.js`)

#### 1. **createUser** - Registration
```javascript
exports.createUser = async (req, res) => {
  // 1. Validate all fields present
  // 2. Check if user already exists (email/phone)
  // 3. Hash password using bcrypt
  // 4. Generate unique serial number
  // 5. Create new buyer document
  // 6. Log action in AuditLog
  // 7. Return success response
};
```

**Request Flow:**
```
POST /auth/register
  ↓
Validation (fullName, email, phoneNo, password)
  ↓
Check email/phone uniqueness
  ↓
Hash password: "SecurePass" → "$2b$10$abcd..."
  ↓
Generate serial: "BUY001"
  ↓
Save to Buyer collection
  ↓
Create AuditLog entry
  ↓
Return 201 Created
```

#### 2. **loginUser** - Authentication
```javascript
exports.loginUser = async (req, res) => {
  // 1. Validate email and password provided
  // 2. Find user by email in Buyer collection
  // 3. Compare provided password with stored hash
  // 4. If valid: Generate JWT token
  // 5. Log login action in AuditLog
  // 6. Return token
};
```

**Request Flow:**
```
POST /auth/login
  ↓
Validate email & password
  ↓
Find user in database
  ↓
Compare password (plain vs hash)
  ↓
bcrypt says: Match? ✓
  ↓
Generate JWT: jwt.sign({ id: user._id }, secret, { expiresIn: "7d" })
  ↓
Log action in AuditLog
  ↓
Return { success: true, token: "eyJ..." }
```

#### 3. **getUsersDetails** - Profile Fetch
```javascript
exports.getUsersDetails = async (req, res) => {
  // Protected route - req.user._id already set by verifyUser
  // 1. Query Buyer collection by req.user._id
  // 2. Select specific fields (exclude password)
  // 3. Format response with organized data
  // 4. Return buyer details
};
```

#### 4. **updateBuyerProfile** - Profile Update
```javascript
exports.updateBuyerProfile = async (req, res) => {
  // Protected route
  // 1. Validation (country in westAfricaCountries list)
  // 2. Validate state if country is Nigeria
  // 3. Handle file uploads (profilePhoto)
  // 4. Update buyer document
  // 5. Log update in AuditLog
  // 6. Return updated data
};
```

#### 5. **addToCart** - Add to Cart
```javascript
exports.addToCart = async (req, res) => {
  // Protected route
  // 1. Get user ID from req.user._id
  // 2. Check if cart already exists for user
  // 3. If new cart: Create with first item
  // 4. If exists: Check product already in cart
  //    - If duplicate: Increase quantity
  //    - If new: Push to items array
  // 5. Save cart document
  // 6. Return updated cart
};
```

**Cart Logic:**
```
User: "BUY001"
Adds Product: "PROD123" (qty: 2)
  ↓
Check: Does "BUY001" have cart?
  ├─ NO: Create new cart
  │       → items: [{ product: "PROD123", quantity: 2 }]
  └─ YES: Check items array
          ├─ "PROD123" found?
          │  ├─ YES: quantity += 2
          │  └─ NO: Push { product: "PROD123", quantity: 2 }
  ↓
Save and return cart
```

#### 6. **getCart** - View Cart
```javascript
exports.getCart = async (req, res) => {
  // Protected route
  // 1. Find cart by req.user._id
  // 2. Populate product details (name, price, image)
  // 3. Populate vendor info (storeName)
  // 4. Return full cart data with product/vendor info
};
```

#### 7. **updateCartItem** - Update Quantity
```javascript
exports.updateCartItem = async (req, res) => {
  // Protected route
  // 1. Find cart for user
  // 2. Find specific product in items array
  // 3. If quantity <= 0: Remove item
  // 4. Else: Update quantity
  // 5. Save and return
};
```

#### 8. **removeFromCart** - Delete from Cart
```javascript
exports.removeFromCart = async (req, res) => {
  // Protected route
  // 1. Find cart for user
  // 2. Filter items array to remove product
  // 3. Save cart
  // 4. Return updated cart
};
```

---

### **Vendor Controller** (`vendor.controller.js`)

#### 1. **createUser** - Vendor Registration
```javascript
exports.createUser = async (req, res) => {
  // Same pattern as Buyer registration
  // But saves to Vendor collection
  // Generates serial like "VEN001"
};
```

#### 2. **addProduct** - Create Product
```javascript
exports.addProduct = async (req, res) => {
  // Protected route - Vendor only
  // 1. Get vendor ID from req.user._id
  // 2. Get image from Multer/Cloudinary
  // 3. Validate product fields
  // 4. Create Product document with vendor reference
  // 5. Save to AddProduct collection
  // 6. Log action
  // 7. Return created product
};
```

**Product Creation Flow:**
```
POST /product/add (with image file)
  ↓
Multer middleware
  └─ Upload image to Cloudinary
  └─ Store URL in req.files
  ↓
validateFields (name, description, price, stock)
  ↓
Create AddProduct document:
{
  vendor: req.user._id,      // Vendor ID
  name: "Gaming Laptop",
  description: "...",
  image: "https://cloudinary.com/...",  // Cloudinary URL
  price: 150000,
  originalPrice: 200000,
  stock: 5,
  category: "Electronics",
  status: "in-stock"          // Auto-calculated from stock
}
  ↓
Save to database
  ↓
Log in AuditLog
  ↓
Return created product with ID
```

#### 3. **getVendorProducts** - Vendor's Own Products
```javascript
exports.getVendorProducts = async (req, res) => {
  // Protected route
  // 1. Query AddProduct where vendor == req.user._id
  // 2. Return only this vendor's products
};
```

#### 4. **getAllProducts** - Public Products
```javascript
exports.getAllProducts = async (req, res) => {
  // Public route (no authentication)
  // 1. Query all AddProduct documents
  // 2. Populate vendor information
  // 3. Return all products available on platform
};
```

#### 5. **updateProduct** - Edit Product
```javascript
exports.updateProduct = async (req, res) => {
  // Protected route - Vendor only
  // Verify vendor owns this product before updating
  // 1. Find product by ID
  // 2. Check product.vendor == req.user._id
  // 3. Update fields
  // 4. If new image: Upload to Cloudinary
  // 5. Save and return
};
```

#### 6. **deleteProduct** - Remove Product
```javascript
exports.deleteProduct = async (req, res) => {
  // Protected route - Vendor only
  // 1. Find product by ID
  // 2. Verify vendor owns product
  // 3. Delete from AddProduct collection
  // 4. Return success
};
```

#### 7. **saveVendorPayout** - Payment Configuration
```javascript
exports.saveVendorPayout = async (req, res) => {
  // Protected route
  // 1. Get vendor ID from req.user._id
  // 2. Validate bank details (bankName, accountNumber, etc.)
  // 3. Update vendor document
  // 4. Save for future payouts
};
```

---

### **Founder Controller** (`founder.controller.js`)

Similar to Buyer/Vendor but for admin users:
- Registration with founder role
- Login
- Access to admin dashboard (to be expanded)

---

## 🔧 Middleware

### 1. **verifyUser Middleware** - JWT Verification

**Location**: `middleware/verifyUser.js`

```javascript
const verifyUser = (req, res, next) => {
  try {
    // Step 1: Extract token from Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }
    
    // Step 2: Verify token signature and expiration
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    
    // Step 3: Attach decoded user info to request
    req.user = {};
    req.user._id = decoded.id;
    
    // Step 4: Continue to next middleware/controller
    next();
    
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
```

**How It's Used:**
```javascript
// In routes:
router.get('/profile/me', verifyUser, getUsersDetails);
//                        ↑ Authentication middleware
//                          Runs before getUsersDetails

// Flow:
POST /profile/me
  ↓
verifyUser middleware
  ├─ Check token exists
  ├─ Verify signature
  ├─ Extract user ID
  └─ Attach to req.user._id
  ↓
getUsersDetails controller
  ├─ req.user._id available
  └─ Fetch user-specific data
  ↓
Response
```

---

### 2. **imageUpload Middleware** - File Upload Handling

**Location**: `middleware/imageUpload.js`

```javascript
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "gmc/product/image",      // Cloudinary folder
    resource_type: "image",
    format: "png",
    public_id: Date.now() + "-" + file.originalname
  })
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024          // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG allowed"), false);
    }
    
    cb(null, true);
  }
});
```

**Usage:**
```javascript
// Single image
router.post('/product/add', 
  verifyUser,
  imageUpload.single("image"),        // Expect "image" field
  addProduct
);

// Multiple images
router.put('/profile/me',
  verifyUser,
  imageUpload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
  ]),
  updateProfile
);
```

**File Upload Flow:**
```
POST /product/add (multipart/form-data)
  ├─ name: "Gaming Laptop"
  ├─ price: "150000"
  └─ image: <binary file data>
  ↓
Multer middleware
  ├─ Validate file type (JPEG/PNG/JPG)
  ├─ Check file size (< 5MB)
  ├─ Upload to Cloudinary
  └─ Store URL from Cloudinary
  ↓
req.files.image[0].path = "https://cloudinary.com/..."
  ↓
Controller receives
  └─ Save URL to database
  ↓
Response
```

---

### 3. **Error Handler Middleware** (To be Implemented)

```javascript
// Global error handler should wrap all routes:
app.use((error, req, res, next) => {
  if (error instanceof ValidationError) {
    return res.status(400).json({ message: error.message });
  }
  
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  return res.status(500).json({ message: 'Server error' });
});
```

---

### **Middleware Chain Order**

```
Request
  ↓
CORS Middleware (app.use(cors()))
  ├─ Allow requests from frontend
  ├─ Include credentials
  ↓
Body Parser (express.json(), urlencoded())
  ├─ Parse JSON body
  ├─ Parse form data
  ↓
Route Middleware
  ├─ verifyUser (checks JWT)
  ├─ imageUpload (handles files)
  ├─ Custom middleware
  ↓
Controller Logic
  ↓
Response
```

---

## 📊 Data Flow Explanation

### **Scenario 1: User Registration**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. FRONTEND SENDS DATA                                      │
├─────────────────────────────────────────────────────────────┤
│ POST /api/buyer/auth/register                              │
│ {                                                           │
│   "fullName": "John Doe",                                  │
│   "email": "john@student.com",                             │
│   "phoneNo": "+234801234567",                              │
│   "password": "SecurePassword123"                           │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BACKEND RECEIVES REQUEST (app.js)                       │
├─────────────────────────────────────────────────────────────┤
│ - CORS checks origin                                       │
│ - Body parser extracts JSON                                │
│ - Routes to: buyerRoutes                                   │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONTROLLER: createUser (buyer.controller.js)            │
├─────────────────────────────────────────────────────────────┤
│ exports.createUser = async (req, res) => {                 │
│   const { fullName, email, phoneNo, password } = req.body; │
│   ↓                                                         │
│   // Validation                                             │
│   if (!fullName) ❌ return error                            │
│   ↓                                                         │
│   // Check duplicate email                                 │
│   const existing = await buyerModel.findOne({email});      │
│   if (existing) ❌ return "User exists"                    │
│   ↓                                                         │
│   // Hash password                                          │
│   password = "SecurePassword123"                           │
│   ↓                                                         │
│   bcrypt.hash(password, 10)                                │
│   ↓                                                         │
│   hashPassword = "$2b$10$abcdef123456789..."              │
│   ↓                                                         │
│   // Generate serial                                       │
│   serialNo = await generateSerialNumber("buyer")           │
│   // Query serialCounter.findOneAndUpdate()                │
│   // Returns: "BUY001"                                     │
│   ↓                                                         │
│   // Create account                                        │
│   const buyer = new buyerModel({                           │
│     serialNumber: "BUY001",                                │
│     fullName: "John Doe",                                  │
│     email: "john@student.com",                             │
│     phoneNo: "+234801234567",                              │
│     password: "$2b$10$abcdef123456789..."                  │
│   });                                                       │
│   ↓                                                         │
│   // Save to MongoDB                                       │
│   await buyer.save();                                      │
│   // Generates _id: ObjectId("507f1f77bcf86cd799439011")   │
│   ↓                                                         │
│   // Log action                                            │
│   await AuditLog.create({                                  │
│     user: "507f1f77bcf86cd799439011",                      │
│     role: "buyer",                                         │
│     action: "REGISTER_ACCOUNT",                             │
│     entity: "Buyer",                                       │
│     entityId: "507f1f77bcf86cd799439011",                  │
│     metadata: { email: "john@student.com" }                │
│   });                                                       │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DATABASE OPERATIONS                                      │
├─────────────────────────────────────────────────────────────┤
│ MongoDB Collections:                                        │
│ ¶ Buyers insert {                                          │
│     _id: ObjectId("507f1f77bcf86cd799439011"),            │
│     serialNumber: "BUY001",                                │
│     fullName: "John Doe",                                  │
│     email: "john@student.com",                             │
│     phoneNo: "+234801234567",                              │
│     password: "$2b$10$abcdef123456789...",                 │
│     updatedAt: null                                        │
│   }                                                         │
│ ¶ AuditLogs insert {                                       │
│     user: ObjectId("507f1f77bcf86cd799439011"),            │
│     role: "buyer",                                         │
│     action: "REGISTER_ACCOUNT",                             │
│     ...                                                     │
│   }                                                         │
│ ¶ SerialCounters update {                                  │
│     model: "buyer",                                        │
│     count: 2  // Incremented from 1                        │
│   }                                                         │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. BACKEND SENDS RESPONSE                                   │
├─────────────────────────────────────────────────────────────┤
│ HTTP 201 Created                                           │
│ {                                                           │
│   "success": true,                                          │
│   "message": "🎉 User Account Created Successfully!"       │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. FRONTEND HANDLES RESPONSE                               │
├─────────────────────────────────────────────────────────────┤
│ - Show success message                                     │
│ - Redirect to login page                                   │
│ - Clear form                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### **Scenario 2: User Login & Token Generation**

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND SUBMITS LOGIN                                        │
├──────────────────────────────────────────────────────────────────┤
│ POST /api/buyer/auth/login                                      │
│ {                                                                 │
│   "email": "john@student.com",                                  │
│   "password": "SecurePassword123"                                │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER: loginUser (buyer.controller.js)                  │
├──────────────────────────────────────────────────────────────────┤
│ Step 1: Validate input                                           │
│ if (!email || !password) ❌ return error                         │
│ ↓                                                                 │
│ Step 2: Find user in database                                    │
│ const user = await buyerModel.findOne({                          │
│   email: "john@student.com"                                      │
│ });                                                               │
│ // Returns: { _id: ObjectId, fullName, password: "$2b$..." }    │
│ ↓                                                                 │
│ Step 3: Compare passwords                                        │
│ const match = await bcrypt.compare(                              │
│   "SecurePassword123",                    // Plaintext from form │
│   "$2b$10$abcdef123456789..."             // Hash from database  │
│ );                                                                │
│ // bcrypt internally:                                             │
│ // - Extracts salt from hash                                    │
│ // - Hashes plaintext with same salt                            │
│ // - Compares both hashes                                       │
│ // Returns: true ✓                                              │
│ if (!match) ❌ return "Invalid credentials"                      │
│ ↓                                                                 │
│ Step 4: Generate JWT token                                       │
│ const token = jwt.sign(                                          │
│   { id: user._id },                      // Payload             │
│   process.env.JWT_KEY,                   // Secret: "my_secret" │
│   { expiresIn: "7d" }                    // Expires in 7 days   │
│ );                                                                │
│ // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."          │
│ // Token contains:                                               │
│ // - Header: { alg: "HS256", typ: "JWT" }                      │
│ // - Payload: { id: "507f1f77bcf86cd799439011" }               │
│ // - Signature: HMAC-SHA256(base64(header).base64(payload))     │
│ ↓                                                                 │
│ Step 5: Log login                                                │
│ await AuditLog.create({                                          │
│   user: user._id,                                                │
│   role: "buyer",                                                 │
│   action: "LOG_IN",                                              │
│   ...                                                             │
│ });                                                               │
│ ↓                                                                 │
│ Step 6: Return token to frontend                                 │
│ return res.status(200).json({                                    │
│   success: true,                                                 │
│   message: "Login successful",                                   │
│   token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."             │
│ });                                                               │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ 3. FRONTEND STORES TOKEN                                         │
├──────────────────────────────────────────────────────────────────┤
│ localStorage.setItem('token',                                    │
│   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'                   │
│ );                                                                │
│                                                                   │
│ Now use this token in all authenticated requests:                │
│ Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ 4. SUBSEQUENT AUTHENTICATED REQUEST                              │
├──────────────────────────────────────────────────────────────────┤
│ GET /api/buyer/profile/me                                       │
│ Headers:                                                          │
│ Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ 5. MIDDLEWARE: verifyUser checks request                        │
├──────────────────────────────────────────────────────────────────┤
│ const verifyUser = (req, res, next) => {                        │
│   try {                                      │
│     // Extract token from header             │
│     const token = req.headers.authorization  │
│       .split(" ")[1];                        │
│     // Now token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  │
│     ↓                                        │
│     // Verify token signature                │
│     const decoded = jwt.verify(              │
│       token,                                 │
│       process.env.JWT_KEY                   │
│     );                                       │
│     // jwt.verify:                            │
│     // - Splits token into 3 parts          │
│     // - Recalculates signature             │
│     // - Compares with original            │
│     // - Checks expiration                 │
│     // Returns: { id: "507f1f77bcf86cd799439011", iat: 1234, exp: 5678 }
│     ↓                                        │
│     // If token is valid and not expired ✓  │
│     req.user = {};                           │
│     req.user._id = decoded.id;               │
│     // Now req.user._id = "507f1f77bcf86cd799439011"        │
│     ↓                                        │
│     next(); // Continue to next middleware  │
│   } catch (error) {                          │
│     return res.status(401).json({           │
│       message: "Invalid or expired token"   │
│     });                                      │
│   }                                          │
│ };                                           │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ 6. CONTROLLER: getUsersDetails runs                             │
├──────────────────────────────────────────────────────────────────┤
│ exports.getUsersDetails = async (req, res) => {                │
│   // req.user._id is available from middleware ✓              │
│   const buyer = await buyerModel.findById(req.user._id);      │
│   // Queries: db.buyers.findById("507f1f77bcf86cd799439011") │
│   // Returns: { _id, fullName, email, profilePhoto, ... }    │
│   ↓                                                             │
│   return res.status(200).json({                                │
│     success: true,                                             │
│     data: {                                                    │
│       identity: { fullName, profilePhoto, ... },              │
│       contact: { email, phoneNo },                             │
│       ...  more data ...                                       │
│     }                                                           │
│   });                                                           │
│ };                                                              │
└──────────────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────────────┐
│ 7. RESPONSE SENT TO FRONTEND                                    │
├──────────────────────────────────────────────────────────────────┤
│ HTTP 200 OK                                                     │
│ {                                                                 │
│   "success": true,                                              │
│   "data": { ... user profile data ... }                        │
│ }                                                                 │
└──────────────────────────────────────────────────────────────────┘
```

---

### **Scenario 3: Adding Product to Cart**

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. BUYER CLICKS "ADD TO CART"                                      │
├────────────────────────────────────────────────────────────────────┤
│ Frontend sends:                                                    │
│ POST /api/buyer/cart/add                                         │
│ Headers: Authorization: Bearer <token>                           │
│ Body: {                                                           │
│   "productId": "507f1f77bcf86cd799439012",                      │
│   "quantity": 2                                                  │
│ }                                                                   │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ 2. MIDDLEWARE: verifyUser                                          │
├────────────────────────────────────────────────────────────────────┤
│ - Validates token                                                 │
│ - Sets req.user._id = "507f1f77bcf86cd799439011" (buyer ID)     │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ 3. CONTROLLER: addToCart (buyer.controller.js)                    │
├────────────────────────────────────────────────────────────────────┤
│ exports.addToCart = async (req, res) => {                         │
│   const userId = req.user._id;  // "507f1f77bcf86cd799439011"  │
│   const { productId, quantity } = req.body;                      │
│                                                                    │
│   // Step 1: Check if buyer already has a cart                   │
│   let cart = await Cart.findOne({ user: userId });               │
│   // Query: db.carts.findOne({ user: ObjectId("...") })         │
│                                                                    │
│   if (!cart) {                                                    │
│     // Step 2a: IF NO CART EXISTS - CREATE NEW                   │
│     cart = new Cart({                                             │
│       user: userId,  // "507f1f77bcf86cd799439011"              │
│       items: [{                                                   │
│         product: productId,  // "507f1f77bcf86cd799439012"      │
│         quantity: quantity || 1      // 2                        │
│       }],                                                         │
│     });                                                           │
│   } else {                                                        │
│     // Step 2b: IF CART EXISTS - UPDATE IT                       │
│     const existingItem = cart.items.find(                         │
│       (item) => item.product.toString() === productId             │
│     );                                                             │
│     // Check if same product already in cart                      │
│                                                                    │
│     if (existingItem) {                                           │
│       // Step 2b-i: PRODUCT ALREADY IN CART - INCREASE QTY      │
│       existingItem.quantity += quantity || 1;                     │
│       // Before: quantity = 1                                    │
│       // After: quantity = 3  (1 + 2)                            │
│     } else {                                                      │
│       // Step 2b-ii: NEW PRODUCT - ADD TO ITEMS ARRAY            │
│       cart.items.push({                                           │
│         product: productId,                                       │
│         quantity: quantity || 1                                   │
│       });                                                         │
│     }                                                             │
│   }                                                               │
│                                                                    │
│   // Step 3: SAVE CART TO DATABASE                                │
│   await cart.save();                                              │
│   // MongoDB now has:                                             │
│   // {                                                             │
│   //   _id: ObjectId(),                                           │
│   //   user: ObjectId("507f1f77bcf86cd799439011"),              │
│   //   items: [                                                   │
│   //     { product: ObjectId("507f1f77bcf86cd799439012"), quantity: 2 },
│   //     ...other items...                                       │
│   //   ],                                                         │
│   //   createdAt, updatedAt                                      │
│   // }                                                             │
│                                                                    │
│   // Step 4: RETURN UPDATED CART                                  │
│   return res.status(200).json({                                   │
│     success: true,                                                │
│     message: "Product added to cart",                             │
│     data: cart   // Entire cart object                           │
│   });                                                             │
│ };                                                                │
└────────────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────────────┐
│ 4. FRONTEND RECEIVES RESPONSE                                      │
├────────────────────────────────────────────────────────────────────┤
│ {                                                                   │
│   "success": true,                                                 │
│   "message": "Product added to cart",                             │
│   "data": {                                                        │
│     "_id": "507f1f77bcf86cd799439099",                           │
│     "user": "507f1f77bcf86cd799439011",                          │
│     "items": [                                                    │
│       {                                                           │
│         "product": "507f1f77bcf86cd799439012",                   │
│         "quantity": 2                                            │
│       }                                                           │
│     ],                                                            │
│     "createdAt": "2024-04-09T10:30:00Z",                         │
│     "updatedAt": "2024-04-09T10:35:00Z"                          │
│   }                                                                │
│ }                                                                   │
│                                                                    │
│ - Show toast: "✓ Product added to cart!"                         │
│ - Update cart count badge on header: "1 item"                    │
│ - Store cart data in state for later orders                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security Practices

### 1. **Password Security**

```javascript
// ❌ WRONG - Storing plain password
password: "SecurePassword123"   // NEVER do this!

// ✓ CORRECT - Using bcrypt
const saltRounds = 10;
const hashPassword = await bcrypt.hash(password, saltRounds);
// Stores: "$2b$10$N9qo8uLOickgxHbAT5ZDuuYt6PZbQaqJvgBZL.D6IHQ3Vl1Zh1r/K"

// bcrypt algorithm:
// 1. Generates random salt
// 2. Hashes plaintext with salt 10 times (slow = brute force resistant)
// 3. Combines salt + hash into single string
// 4. Salt is stored WITH hash, so same password always produces same hash

// Verification (no plaintext comparison):
const isValid = await bcrypt.compare(inputPassword, storedHash);
// Returns true/false
```

**Why bcrypt is Better than MD5/SHA1:**
| Feature | MD5 | SHA1 | bcrypt |
|---------|-----|------|--------|
| Reversible? | ❌ | ❌ | ❌ |
| Salted? | ✗ | ✗ | ✓ |
| Slow? | ⚡ Fast (BAD!) | ⚡ Fast (BAD!) | 🐢 Slow (GOOD!) |
| Rainbow Table Safe? | ❌ | ❌ | ✓ |
| Industry Standard? | ❌ | ❌ | ✓ |

---

### 2. **JWT Token Security**

```javascript
// Token has 3 parts: header.payload.signature
// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
// eyJpZCI6IjEyMzQ1Njc4OTAifQ.
// dozjgNryOt4zCsCgFQ5p5PH6XGk2grWltT5w-0jhQOR

// Part 1: Header (algorithm and type)
// {"alg":"HS256","typ":"JWT"}

// Part 2: Payload (user data)
// {"id":"1234567890"}

// Part 3: Signature (proves authenticity)
// HMACSHA256(
//   base64UrlEncode(header) + "." + base64UrlEncode(payload),
//   secret_key
// )

// Why this is secure:
// 1. Server signs with SECRET_KEY
// 2. Client cannot modify token without signature
// 3. If client modifies payload, signature becomes invalid
// 4. Server calculates signature again and compares

// ✓ Token is verified on EVERY protected request
// ✓ Token expires (default: 7 days)
// ✓ Secret key known only to backend
```

---

### 3. **Input Validation**

```javascript
// ❌ WITHOUT validation:
exports.createUser = async (req, res) => {
  const { fullName, email, phoneNo, password } = req.body;
  const user = new buyerModel({ fullName, email, phoneNo, password });
  await user.save();  // What if email is null? phoneNo is 123?
};

// ✓ WITH validation:
exports.createUser = async (req, res) => {
  const { fullName, email, phoneNo, password } = req.body;
  
  // Check all required fields
  if (!fullName || !email || !phoneNo || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  
  // Check email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }
  
  // Check phone number format
  if (!/^\+?[0-9]{10,15}$/.test(phoneNo)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }
  
  // Check password strength
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be 8+ chars" });
  }
  
  // Check uniqueness
  const existing = await buyerModel.findOne({
    $or: [{ email }, { phoneNo }]
  });
  
  if (existing) {
    return res.status(400).json({ message: "Email or phone already exists" });
  }
  
  // Now safe to create user
};
```

---

### 4. **File Upload Security**

```javascript
const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024      // ✓ Max 5MB
  },
  fileFilter: (req, file, cb) => {
    // ✓ MIME type check
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG/PNG images allowed"), false);
    }
    cb(null, true);
  }
});

// ✓ Files stored on Cloudinary (CDN) not local server
// ✓ Automatic virus scanning
// ✓ CDN serves optimized images
// ✓ Not stored in database (only URL stored)
```

---

### 5. **CORS Configuration**

```javascript
app.use(cors({
  origin: 'http://localhost:5173',      // ✓ Only allow frontend
  credentials: true                      // ✓ Allow cookies/auth headers
}));

// ❌ WRONG:
app.use(cors({
  origin: '*'   // Allows ANY website to access
}));

// ✓ Production:
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

### 6. **Environment Variables**

```javascript
// ❌ WRONG - Hardcoded secrets:
const JWT_KEY = "my_secret_key";
const MONGO_URL = "mongodb://user:pass@localhost/db";

// ✓ CORRECT - Use .env file:
// .env
MONGO_URL=mongodb://user:pass@localhost/db
JWT_KEY=super_secret_key_never_exposed
PORT=5000
FRONTEND_URL=http://localhost:5173
cloud_Name=your_cloudinary_name
cloud_API_Key=your_api_key
cloud_API_Secret=your_api_secret

// .env NEVER committed to GitHub
// .gitignore includes: .env

// In code:
require('dotenv').config();
const dbUrl = process.env.MONGO_URL;   // Loaded from .env
const jwtKey = process.env.JWT_KEY;
```

---

### 7. **Error Response Security**

```javascript
// ❌ WRONG - Exposes internals:
res.status(500).json({
  message: "User validation error: duplicated email john@test.com at buyerModel.create()"
});

// ✓ CORRECT - Generic messages:
res.status(400).json({
  message: "Email already registered"
});

// ✓ For 500 errors:
res.status(500).json({
  message: "Internal server error"
  // Stack trace logged server-side only
});
```

---

## 🚀 Setup & Installation

### Prerequisites

- Node.js v14 or higher
- MongoDB Atlas account or local MongoDB
- Cloudinary account (for image uploads)
- Git

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

**Dependencies Installed:**
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `bcrypt`: Password hashing
- `jsonwebtoken`: JWT authentication
- `cors`: Cross-origin requests
- `dotenv`: Environment variables
- `multer`: File uploads
- `multer-storage-cloudinary`: Cloud storage
- `cloudinary`: Image CDN
- `nodemailer`: Email notifications

### Step 3: Create Environment File

Create `.env` file in project root:

```env
# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/GMC

# Server
PORT=5000

# Frontend
FRONTEND_URL=http://localhost:5173

# Authentication
JWT_KEY=your_super_secret_jwt_key_change_this_in_production

# Cloudinary (Image Upload)
cloud_Name=your_cloudinary_name
cloud_API_Key=your_api_key
cloud_API_Secret=your_api_secret
```

### Step 4: MongoDB Setup

**Option A: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create new cluster
4. Get connection string: `mongodb+srv://user:pass@...`
5. Add to `.env` as `MONGO_URL`

**Option B: Local MongoDB**
```bash
# Windows
# Download and install from https://www.mongodb.com/try/download/community

# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo apt-get install -y mongodb

# Connection string
MONGO_URL=mongodb://localhost:27017/GMC
```

### Step 5: Cloudinary Setup

1. Go to https://cloudinary.com/
2. Sign up for free account
3. Go to Dashboard
4. Get credentials:
   - Cloud Name
   - API Key
   - API Secret
5. Add to `.env`

### Step 6: Start Server

```bash
# Development
node index.js

# Output:
# ✅ Database Connected Successfully
# 🚀 Server running on port 5000
```

### Step 7: Test API

Using Postman or cURL:

```bash
# Register Buyer
curl -X POST http://localhost:5000/api/buyer/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@student.com",
    "phoneNo": "+234801234567",
    "password": "Password123"
  }'

# Register Vendor
curl -X POST http://localhost:5000/api/vendor/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Jane Smith",
    "email": "jane@student.com",
    "phoneNo": "+234801234568",
    "password": "Password123"
  }'

# Login
curl -X POST http://localhost:5000/api/buyer/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@student.com",
    "password": "Password123"
  }'

# Response:
# {
#   "success": true,
#   "message": "Login successful",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# Use token for protected endpoints:
curl -X GET http://localhost:5000/api/buyer/profile/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📚 Project Summary

### What's Been Built

✅ **User Authentication System**
- Buyer registration & login
- Vendor registration & login
- Founder registration & login
- JWT token generation and verification
- Password hashing with bcrypt

✅ **Product Management**
- Vendors can create products
- Products have images (Cloudinary)
- Categories and stock tracking
- Price and discount fields
- All products viewable publicly

✅ **Shopping Cart**
- Add products to cart
- View cart with populated product details
- Update quantities
- Remove items

✅ **User Profiles**
- Buyer profiles with photo upload
- Vendor profiles with store info
- Profile updates
- Location data (countries, states)

✅ **Audit Logging**
- Track all user actions
- Registration, login, updates logged
- Useful for security and analytics

✅ **File Uploads**
- Cloudinary integration
- Profile photos
- Product images
- Size and type validation

### Still Needed (Future Implementation)

⏳ **Order System**
- Create orders from cart
- Order history
- Order status tracking

⏳ **Reviews & Ratings**
- Leave reviews on products
- Star ratings
- Verified purchase checks

⏳ **Payment Integration**
- Stripe or Paypal integration
- Payment processing
- Invoice generation

⏳ **Analytics & Dashboard**
- Vendor sales analytics
- Admin dashboard
- User statistics

⏳ **Notifications**
- Email notifications (Nodemailer setup)
- Order updates
- New product alerts

⏳ **Search & Filter**
- Full-text search
- Category filtering
- Price range filtering

---

## 📖 Quick Reference

### File Organization

| File | Purpose |
|------|---------|
| `index.js` | Server startup |
| `app.js` | Express app setup |
| `package.json` | Dependencies |
| `controllers/*.js` | Business logic |
| `models/*.js` | MongoDB schemas |
| `routes/*.js` | API endpoints |
| `middleware/*.js` | Request processing |
| `config/*.js` | Configuration |
| `utils/*.js` | Helper functions |

### Common Commands

```bash
# Start server
node index.js

# Install new package
npm install package-name

# Run with nodemon (auto-restart)
npm install -D nodemon
npx nodemon index.js

# Check MongoDB connection
# From MongoDB Atlas: Dashboard → Clusters
```

### Database Queries

```javascript
// Find user by email
const user = await buyerModel.findOne({ email: "john@student.com" });

// Find user by ID
const user = await buyerModel.findById(userId);

// Update user
await buyerModel.findByIdAndUpdate(userId, { username: "john123" });

// Delete user
await buyerModel.findByIdAndDelete(userId);

// Find all products by vendor
const products = await AddProduct.find({ vendor: vendorId });

// Count documents
const count = await buyerModel.countDocuments();
```

---

## 🎓 Learning Resources

- **Express.js**: https://expressjs.com/
- **MongoDB**: https://docs.mongodb.com/
- **Mongoose**: https://mongoosejs.com/
- **JWT**: https://jwt.io/
- **bcrypt**: https://github.com/kelektiv/node.bcrypt.js
- **Cloudinary**: https://cloudinary.com/documentation

---

**Last Updated**: April 9, 2026  
**Version**: 1.0.0  
**Author**: The Great Man Concept

For more information, contact support or refer to the code comments.
