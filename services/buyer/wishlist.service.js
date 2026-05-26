const AuditLog = require('../../models/auditLog.model');
const Wishlist = require('../../models/wishlist.model');
const AppError = require('../common/AppError');

const addToWishlist = async ({ userId, productId }) => {
  if (!productId) throw new AppError('Product ID is required', 400);

  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = new Wishlist({ user: userId, items: [] });

  const exists = wishlist.items.some((item) => item.product.toString() === productId);
  if (exists) throw new AppError('Product already in wishlist', 400);

  wishlist.items.push({ product: productId });
  await wishlist.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'ADD_TO_WISHLIST',
    entity: 'Wishlist',
    entityId: wishlist._id,
    metadata: { productId },
  });

  return wishlist;
};

const removeFromWishlist = async ({ userId, productId }) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) throw new AppError('Wishlist not found', 404);

  const initialLength = wishlist.items.length;
  wishlist.items = wishlist.items.filter((item) => item.product.toString() !== productId);
  if (wishlist.items.length === initialLength) throw new AppError('Item not found in wishlist', 404);

  await wishlist.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'REMOVE_FROM_WISHLIST',
    entity: 'Wishlist',
    entityId: wishlist._id,
    metadata: { productId },
  });

  return wishlist;
};

const clearWishlist = async ({ userId }) => {
  const wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) throw new AppError('Wishlist not found', 404);

  wishlist.items = [];
  await wishlist.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'CLEAR_WISHLIST',
    entity: 'Wishlist',
    entityId: wishlist._id,
  });

  return wishlist;
};

const getWishlist = async ({ userId }) => {
  const wishlist = await Wishlist.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: [
      { path: 'vendor', select: 'storeName businessName fullName' },
      { path: 'category', select: 'name slug' },
      { path: 'subCategory', select: 'name slug' },
    ],
  });

  return { items: wishlist?.items || [] };
};

module.exports = { addToWishlist, removeFromWishlist, clearWishlist, getWishlist };
