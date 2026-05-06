function groupProductsByVendor(products) {
  return products.reduce((groups, product) => {
    const vendorId = product.vendor._id.toString();
    if (!groups[vendorId]) {
      groups[vendorId] = [];
    }
    groups[vendorId].push(product);
    return groups;
  }, {});
}

function shuffleArray(array) {
  const arr = [...array]; 
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Get vendor's visibility multiplier based on subscription tier
 * 
 * ABSTRACT FUNCTION: Currently returns hardcoded 1, but designed for easy
 * future extension to subscription-based tiers.
 * 
 * @param {Object} vendor - Vendor document from MongoDB
 * @returns {number} Visibility multiplier (1x, 2x, 5x, 10x, etc.)
 * 
 * Current behavior:
 * - All vendors treated as "Common" tier = 1x visibility
 * 
 * Future implementation (no other code changes needed):
 * function getVendorMultiplier(vendor) {
 *   const tierMap = {
 *     "common": 1,
 *     "silver": 2,
 *     "gold": 5,
 *     "platinum": 10
 *   };
 *   return tierMap[vendor.subscriptionTier] || 1;
 * }
 * 
 * Then in buildInterleavedFeed(), the round-robin will automatically
 * pick N products per vendor per cycle based on their multiplier.
 */
function getVendorMultiplier(vendor) {
  // TIER-READY: Replace with actual logic when tiers are added
  // const tierMap = {
  //   "common": 1,
  //   "silver": 2,
  //   "gold": 5,
  //   "platinum": 10
  // };
  // return tierMap[vendor.subscriptionTier] || 1;

  // For now: All vendors get equal visibility (1x)
  return 1;
}

function buildInterleavedFeed(vendorGroups, limit = 20) {
  const feed = [];

  let vendorIds = Object.keys(vendorGroups);

  if (vendorIds.length === 0) {
    return feed; // No products available
  }

  vendorIds = shuffleArray(vendorIds);

  const shuffledGroups = {};
  vendorIds.forEach(vendorId => {
    shuffledGroups[vendorId] = shuffleArray(vendorGroups[vendorId]);
  });

  const vendorIndices = {};
  vendorIds.forEach(vendorId => {
    vendorIndices[vendorId] = 0;
  });

  let currentVendorIndex = 0;
  let allVendorsExhausted = false;

  while (feed.length < limit && !allVendorsExhausted) {
    allVendorsExhausted = true;

    for (let i = 0; i < vendorIds.length && feed.length < limit; i++) {
      const vendorId = vendorIds[currentVendorIndex % vendorIds.length];
      const vendorProducts = shuffledGroups[vendorId];
      const currentIndex = vendorIndices[vendorId];

      if (currentIndex < vendorProducts.length) {
        feed.push(vendorProducts[currentIndex]);
        vendorIndices[vendorId]++;
        allVendorsExhausted = false;
      }

      currentVendorIndex++;
    }
  }

  return feed;
}

function validateLimit(limitParam, defaultLimit = 20, maxLimit = 100) {
  const limit = parseInt(limitParam) || defaultLimit;
  return Math.max(1, Math.min(limit, maxLimit));
}

// Helper function to group items by vendor
const AddProduct = require('../models/addproduct.model')

const groupByVendor = async (items) => {
  const grouped = {};

  for (const item of items) {
    const product = await AddProduct.findById(item.id).populate("vendor", "_id");
    if (product && product.vendor) {
      const vendorId = product.vendor._id.toString();
      if (!grouped[vendorId]) {
        grouped[vendorId] = [];
      }
      grouped[vendorId].push(item);
    }
  }

  return grouped;
};

// Helper function to reduce vendor stock after order confirmed
const updateProductStockAfterOrder = async (items) => {
  for (const item of items) {
    const product = await AddProduct.findById(item.productId);

    if (!product) {
      throw new Error(`Product not found for item: ${item.name}`);
    }

    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
      );
    }

    const newStock = product.stock - item.quantity;

    let newStatus = "in-stock";

    if (newStock === 0) {
      newStatus = "out-of-stock";
    } else if (newStock <= 5) {
      newStatus = "low-in-stock";
    }

    product.stock = newStock;
    product.status = newStatus;

    await product.save();
  }
};

// Date range for vendor analyics
const getDateRange = (range) => {
  const now = new Date();
  let startDate = new Date();

  switch (range) {
    case "24h":
      startDate.setDate(now.getDate() - 1);
      break;

    case "7days":
      startDate.setDate(now.getDate() - 7);
      break;

    case "30days":
      startDate.setDate(now.getDate() - 30);
      break;

    case "90days":
      startDate.setDate(now.getDate() - 90);
      break;

    default:
      startDate.setDate(now.getDate() - 7);
  }

  return startDate;
};

// Export all functions for use in controllers
module.exports = {
  groupProductsByVendor,
  shuffleArray,
  buildInterleavedFeed,
  getVendorMultiplier,
  validateLimit,
  groupByVendor,
  updateProductStockAfterOrder,
  getDateRange
};
