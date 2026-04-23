# Subscription Tiers Implementation Guide

## Quick Start: How to Add Tiers Without Rewriting Code

This guide shows exactly how to upgrade the feed algorithm to support subscription tiers in **<5 minutes**.

---

## Current State (Before Tiers)

All vendors are treated as **Common tier** (1x visibility):
```
const { buildInterleavedFeed } = require('../utils/feedAlgorithm');

// Algorithm picks 1 product per vendor per cycle
```

---

## Step-by-Step Upgrade

### STEP 1: Update Vendor Model (2 minutes)

File: `models/vendor.model.js`

```javascript
const vendor = new mongoose.Schema({
  serialNumber: { type: String, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNo: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  // ✅ ADD THIS FIELD
  subscriptionTier: {
    type: String,
    enum: ['common', 'silver', 'gold', 'platinum'],
    default: 'common'
  },

  // ... rest of fields ...
  updatedAt: Date
});

module.exports = mongoose.model('Vendor', vendor);
```

### STEP 2: Update getVendorMultiplier Function (2 minutes)

File: `utils/feedAlgorithm.js`

**Find this function:**
```javascript
function getVendorMultiplier(vendor) {
  // Currently, all vendors are treated as Common tier (1x visibility)
  // This function is here for future tier implementation
  return 1;
}
```

**Replace with:**
```javascript
function getVendorMultiplier(vendor) {
  // Tier-to-multiplier mapping
  const tierMap = {
    'common': 1,      // 1x: Regular visibility
    'silver': 2,      // 2x: Double visibility
    'gold': 5,        // 5x: 5x more visibility
    'platinum': 10    // 10x: Premium visibility
  };
  
  // Return multiplier based on tier, default to common (1)
  return tierMap[vendor.subscriptionTier] || 1;
}
```

### STEP 3: Done! 🎉

That's it. The feed algorithm now automatically:
- Picks products according to each vendor's tier
- Silver vendors get 2 spots per cycle
- Gold vendors get 5 spots per cycle
- Platinum vendors get 10 spots per cycle

---

## How It Works After Tiers

### Example: Mixed Tiers

**Database:**
```
Vendor A (Common): 1x
  └─ [P1, P2, P3, P4]

Vendor B (Silver): 2x
  └─ [P5, P6, P7]

Vendor C (Platinum): 10x
  └─ [P8, P9, P10, P11, P12]
```

**Round-Robin Interleaving:**
```
Cycle 1:
  Vendor A: Pick P1 (1 product)
  Vendor B: Pick P5, P6 (2 products)
  Vendor C: Pick P8-P12 (10 products)

Cycle 2:
  Vendor A: Pick P2 (1 product)
  Vendor B: Pick P7 (2 products)
  Vendor C: P13, P14... (next 10)

Cycle 3:
  Vendor A: Pick P3 (1 product)
  Vendor B: (all exhausted, skip)
  Vendor C: ...
```

**Result Feed (limit=20):**
```
[P1, P5, P6, P8, P9, P10, P11, P12, P13, P14, P15, P16, P17...]
              ↑
          Platinum vendor's
         products appear
          more frequently
```

---

## Testing After Tier Implementation

### 1. Create Test Vendors

```bash
# Via MongoDB directly
db.vendors.insertOne({
  fullName: "Premium Store",
  email: "premium@store.com",
  subscriptionTier: "platinum",
  // ... other fields
})
```

### 2. Test the Endpoint

```bash
# Request feed
GET /api/vendor/product/all?limit=20

# Check response - premium tier products should appear more frequently
curl http://localhost:5000/api/vendor/product/all?limit=50 | jq '.data[].vendor.subscriptionTier'

# Should see:
# "platinum" multiple times
# "gold" several times
# "silver" few times
# "common" once or twice
```

### 3. Verify Distribution

```javascript
// Quick verification script
const { buildInterleavedFeed, groupProductsByVendor } = require('./utils/feedAlgorithm');

const feed = await getAllProducts(); // Fetch feed
const vendorCounts = {};

feed.forEach(product => {
  const vendorId = product.vendor._id;
  vendorCounts[vendorId] = (vendorCounts[vendorId] || 0) + 1;
});

console.log(vendorCounts);
// Platinum vendors should have highest counts
// Common vendors should have lowest counts
```

---

## Database Migration (If Adding to Existing Vendors)

### Option 1: MongoDB CLI

```bash
# Connect to MongoDB
mongo

# Update all existing vendors to Common tier
db.vendors.updateMany(
  { subscriptionTier: { $exists: false } },
  { $set: { subscriptionTier: "common" } }
)

# Verify
db.vendors.find({}, { fullName: 1, subscriptionTier: 1 })
```

### Option 2: Via Node Script

Create `scripts/addTiersField.js`:

```javascript
const mongoose = require('mongoose');
const Vendor = require('../models/vendor.model');

async function addTiersField() {
  try {
    const result = await Vendor.updateMany(
      { subscriptionTier: { $exists: false } },
      { $set: { subscriptionTier: 'common' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} vendors`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addTiersField();
```

Run with:
```bash
node scripts/addTiersField.js
```

---

## No Code Changes Needed In

✅ `buildInterleavedFeed()` - Works as-is with tiers  
✅ `groupProductsByVendor()` - No changes needed  
✅ `shuffleArray()` - No changes needed  
✅ `controllers/vendor.controller.js` - Already tier-ready  
✅ Other controllers using the algorithm - No changes needed  

**Why?** Because we designed the algorithm to be tier-agnostic from the start!

---

## Pricing & Monetization

Once tiers are implemented, add a payment system:

```javascript
// Future: Stripe billing
app.post('/api/vendor/upgrade-tier', async (req, res) => {
  const { tier } = req.body;
  
  // Validate tier
  if (!['silver', 'gold', 'platinum'].includes(tier)) {
    return res.status(400).json({ message: 'Invalid tier' });
  }
  
  // Calculate price
  const tierPrices = {
    'silver': 5000,    // ₦5,000/month
    'gold': 15000,     // ₦15,000/month
    'platinum': 50000  // ₦50,000/month
  };
  
  // Process payment with Stripe
  const price = tierPrices[tier];
  // ... create Stripe checkout ...
  
  // On successful payment:
  const vendor = await Vendor.findByIdAndUpdate(
    req.user._id,
    { subscriptionTier: tier },
    { new: true }
  );
  
  res.json({ success: true, message: `Upgraded to ${tier}`, vendor });
});
```

---

## Example: Before & After Comparison

### BEFORE (Current Implementation)

```javascript
exports.getAllProducts = async (req, res) => {
  const products = await AddProduct.find();
  // Returns products in createdAt order
  // No vendor distribution logic
  res.json({ data: products }); // Not fair to vendors
};
```

**Problem**: Vendors who created products first appear first. New vendors get buried. No incentive to upgrade.

---

### AFTER (With Tiers)

```javascript
exports.getAllProducts = async (req, res) => {
  const products = await AddProduct.find();
  const vendorGroups = groupProductsByVendor(products);
  const feed = buildInterleavedFeed(vendorGroups, limit);
  
  // Feed respects subscriptionTier automatically!
  // Premium vendors appear more frequently
  // Incentivizes tier upgrades
  res.json({ success: true, count: feed.length, data: feed });
};
```

**Benefit**: Vendors see immediate visibility increase when upgrading. Everyone gets fair baseline visibility. Premium vendors stand out.

---

## Checklist Before Going Live

- [ ] Add `subscriptionTier` field to Vendor model
- [ ] Update `getVendorMultiplier()` function
- [ ] Migrate existing vendors to 'common' tier
- [ ] Test with mixed tiers locally
- [ ] Verify feed uses correct multipliers
- [ ] Update API documentation
- [ ] Add audit logging for tier changes
- [ ] Create vendor dashboard showing visibility stats
- [ ] Set up Stripe integration (future)
- [ ] Design tier pricing tiers (future)

---

## Performance Notes

### Multiplier Impact on Speed

With 1000 products and 50 vendors:

```
Without tiers: ~20 products/cycle → ~50 cycles
With 2x average multiplier: ~40 products/cycle → ~25 cycles

Speed impact: MINIMAL (same O(n) complexity)
```

The round-robin is O(1) per vendor, so tier multipliers don't degrade performance.

---

## FAQ

**Q: Do I need to change the database schema?**  
A: Just add the `subscriptionTier` field. No breaking changes.

**Q: Will this break existing functionality?**  
A: No. Vendors default to 'common' (1x), same as current behavior.

**Q: Can I rollback if needed?**  
A: Yes. Remove tier logic from `getVendorMultiplier()` and revert to `return 1`.

**Q: What if a vendor doesn't have a tier set?**  
A: The multiplier function defaults to 1 (common). Handled safely.

---

## Real-World Example Timeline

```
April 21, 2026
└─ Feed algorithm deployed (1x for all)

May 01, 2026
└─ Add subscriptionTier field to schema
└─ Update getVendorMultiplier() function
└─ Go live with tier-based visibility

May 15, 2026
└─ Launch tier pricing page
└─ Open Stripe integration
└─ Start selling Silver/Gold/Platinum

June 01, 2026
└─ Marketing push for tier upgrades
└─ Track tier adoption metrics
└─ Adjust pricing based on demand
```

---

## Support

Need help implementing tiers?

1. Read through [FEED_ALGORITHM_DOCS.md](./FEED_ALGORITHM_DOCS.md)
2. Check the comments in `utils/feedAlgorithm.js`
3. Reference this guide step-by-step
4. Test thoroughly before deploying

**The algorithm is production-ready and tier-ready. You're just connecting the dots!**

---

**Created**: April 21, 2026  
**Version**: 1.0  
**Status**: Ready to implement
