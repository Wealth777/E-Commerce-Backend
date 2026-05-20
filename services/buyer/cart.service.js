const Cart = require('../../models/addToCart.model');
const AuditLog = require('../../models/auditLog.model');
const AppError = require('../common/AppError');

const formatCartItems = (cart) => cart.items.map((item) => ({
  id: item.product._id,
  name: item.product.name,
  price: item.product.price,
  image: item.product.image,
  quantity: item.quantity,
  vendorId: item.product.vendor?._id,
  vendorName: item.product.vendor?.storeName,
  vendorBankName: item.product.vendor?.bankName,
  vendorAccountName: item.product.vendor?.accountName,
  vendorAccountNumber: item.product.vendor?.accountNumber,
}));

const addToCart = async ({ userId, productId, quantity = 1 }) => {
  if (!productId) throw new AppError('Product ID is required', 400);

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = new Cart({ user: userId, items: [{ product: productId, quantity }] });
  } else {
    const existingItem = cart.items.find((item) => item.product.toString() === productId);
    if (existingItem) existingItem.quantity += quantity;
    else cart.items.push({ product: productId, quantity });
  }

  await cart.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'ADD_TO_CART',
    entity: 'Cart',
    entityId: cart._id,
    metadata: { productId, quantity },
  });

  return cart;
};

const getCart = async ({ userId }) => {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'vendor', select: '_id storeName bankName accountName accountNumber' },
  });

  return { items: cart ? formatCartItems(cart) : [] };
};

const updateCartItem = async ({ userId, productId, quantity }) => {
  if (!productId) throw new AppError('Product ID is required', 400);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError('Cart not found', 404);

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) throw new AppError('Item not found', 404);

  if (quantity <= 0) cart.items = cart.items.filter((i) => i.product.toString() !== productId);
  else item.quantity = quantity;

  await cart.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'UPDATE_CART_ITEM',
    entity: 'Cart',
    entityId: cart._id,
    metadata: { productId, quantity },
  });

  return cart;
};

const removeFromCart = async ({ userId, productId }) => {
  if (!productId) throw new AppError('Product ID is required', 400);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError('Cart not found', 404);

  const initialLength = cart.items.length;
  cart.items = cart.items.filter((item) => item.product.toString() !== productId);
  if (cart.items.length === initialLength) throw new AppError('Item not found', 404);

  await cart.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'REMOVE_FROM_CART',
    entity: 'Cart',
    entityId: cart._id,
    metadata: { productId },
  });

  return cart;
};

module.exports = { addToCart, getCart, updateCartItem, removeFromCart };
