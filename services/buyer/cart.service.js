const mongoose = require('mongoose');

const Cart = require('../../models/addToCart.model');
const AddProduct = require('../../models/addproduct.model');
const AuditLog = require('../../models/auditLog.model');
const AppError = require('../common/AppError');

const toObjectIdString = (value) => {
  if (!value) return '';
  return value.toString();
};

const normalizeQuantity = (quantity) => {
  const parsedQuantity = Number(quantity || 1);

  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    throw new AppError('Quantity must be a positive whole number', 400);
  }

  return parsedQuantity;
};

const validateProductId = (productId) => {
  if (!productId) {
    throw new AppError('Product ID is required', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new AppError('Invalid product ID', 400);
  }
};

const getAvailableProduct = async (productId) => {
  const product = await AddProduct.findById(productId)
    .populate('vendor', '_id business.storeName fullName  bankDetails.bankName bankDetails.accountName bankDetails.accountNumber')
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (Number(product.stock || 0) <= 0) {
    throw new AppError('Product is out of stock', 400);
  }

  return product;
};

const formatCartItems = (cart) => {
  if (!cart || !Array.isArray(cart.items)) {
    return [];
  }

  return cart.items
    .filter((item) => item.product)
    .map((item) => {
      const product = item.product;
      const vendor = product.vendor;

      return {
        id: product._id,
        _id: product._id,

        name: product.name,
        price: Number(product.price || 0),
        image: product.image,

        stock: Number(product.stock || 0),
        quantity: Number(item.quantity || 1),

        category: product.category || null,
        subCategory: product.subCategory || null,

        categoryName: product.category?.name || 'General',

        subCategoryName: product.subCategory?.name || '',

        vendorId: vendor?._id || '',
        vendorName: vendor?.business?.storeName || 'Unknown Vendor',
        vendorBankName: vendor?.bankDetails?.bankName || '',
        vendorAccountName: vendor?.bankDetails?.accountName || '',
        vendorAccountNumber: vendor?.bankDetails?.accountNumber || '',
      };
    });
};

const populateCart = async (cartId) => {
  return Cart.findById(cartId).populate({
    path: 'items.product',
    populate: [
      {
        path: 'vendor',
        select: '_id business.storeName fullName  bankDetails.bankName bankDetails.accountName bankDetails.accountNumber',
      },
      {
        path: 'category',
        select: 'name slug',
      },
      {
        path: 'subCategory',
        select: 'name slug',
      },
    ],
  });
};

const addToCart = async ({ userId, productId, quantity = 1 }) => {
  validateProductId(productId);

  const safeQuantity = normalizeQuantity(quantity);
  const product = await getAvailableProduct(productId);

  const availableStock = Number(product.stock || 0);

  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    const quantityToAdd = Math.min(safeQuantity, availableStock);

    cart = new Cart({
      user: userId,
      items: [
        {
          product: productId,
          quantity: quantityToAdd,
        },
      ],
    });
  } else {
    const existingItem = cart.items.find(
      (item) => toObjectIdString(item.product) === toObjectIdString(productId)
    );

    if (existingItem) {
      const nextQuantity = Number(existingItem.quantity || 0) + safeQuantity;

      if (nextQuantity > availableStock) {
        throw new AppError(
          `Only ${availableStock} item${availableStock > 1 ? 's' : ''} available in stock`,
          400
        );
      }

      existingItem.quantity = nextQuantity;
    } else {
      if (safeQuantity > availableStock) {
        throw new AppError(
          `Only ${availableStock} item${availableStock > 1 ? 's' : ''} available in stock`,
          400
        );
      }

      cart.items.push({
        product: productId,
        quantity: safeQuantity,
      });
    }
  }

  await cart.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'ADD_TO_CART',
    entity: 'Cart',
    entityId: cart._id,
    metadata: {
      productId,
      quantity: safeQuantity,
    },
  });

  const populatedCart = await populateCart(cart._id);

  return {
    items: formatCartItems(populatedCart),
  };
};

const getCart = async ({ userId }) => {
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return { items: [], };
  }

  const populatedCart = await populateCart(cart._id);

  return {
    items: formatCartItems(populatedCart),
  };
};

const updateCartItem = async ({ userId, productId, quantity }) => {
  validateProductId(productId);

  const safeQuantity = Number(quantity || 0);

  if (!Number.isInteger(safeQuantity) || safeQuantity < 0) {
    throw new AppError('Quantity must be a valid whole number', 400);
  }

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const item = cart.items.find(
    (cartItem) => toObjectIdString(cartItem.product) === toObjectIdString(productId)
  );

  if (!item) {
    throw new AppError('Item not found', 404);
  }

  if (safeQuantity <= 0) {
    cart.items = cart.items.filter(
      (cartItem) => toObjectIdString(cartItem.product) !== toObjectIdString(productId)
    );
  } else {
    const product = await getAvailableProduct(productId);
    const availableStock = Number(product.stock || 0);

    if (safeQuantity > availableStock) {
      throw new AppError(
        `Only ${availableStock} item${availableStock > 1 ? 's' : ''} available in stock`,
        400
      );
    }

    item.quantity = safeQuantity;
  }

  await cart.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'UPDATE_CART_ITEM',
    entity: 'Cart',
    entityId: cart._id,
    metadata: {
      productId,
      quantity: safeQuantity,
    },
  });

  const populatedCart = await populateCart(cart._id);

  return {
    items: formatCartItems(populatedCart),
  };
};

const removeFromCart = async ({ userId, productId }) => {
  validateProductId(productId);

  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  const initialLength = cart.items.length;

  cart.items = cart.items.filter(
    (item) => toObjectIdString(item.product) !== toObjectIdString(productId)
  );

  if (cart.items.length === initialLength) {
    throw new AppError('Item not found', 404);
  }

  await cart.save();

  await AuditLog.create({
    user: userId,
    role: 'buyer',
    action: 'REMOVE_FROM_CART',
    entity: 'Cart',
    entityId: cart._id,
    metadata: {
      productId,
    },
  });

  const populatedCart = await populateCart(cart._id);

  return {
    items: formatCartItems(populatedCart),
  };
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
};