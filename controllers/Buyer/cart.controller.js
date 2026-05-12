const logger = require('../../logger');
const AuditLog = require('../../models/auditLog');
const Cart = require("../../models/addToCart.model");

exports.addToCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity: quantity || 1 }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) => item.product.toString() === productId
      );

      if (existingItem) {
        existingItem.quantity += quantity || 1;
      } else {
        cart.items.push({
          product: productId,
          quantity: quantity || 1,
        });
      }
    }

    await cart.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "ADD_TO_CART",
      entity: "Cart",
      entityId: cart._id,
      metadata: {
        productId,
        quantity,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      data: cart,
    });
  } catch (err) {
    logger.error(err)
    return res.status(500).json({
      success: false,
      message: "Error adding to cart",
      error: err.message,
    });
  }
};

exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: {
        path: "vendor",
        select: "_id storeName bankName accountName accountNumber",
      },
    });

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: { items: [] },
      });
    }

    const formattedItems = cart.items.map(item => ({
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

    return res.status(200).json({
      success: true,
      data: {
        items: formattedItems,
      },
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: err.message,
    });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(
      (i) => i.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (i) => i.product.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }

    await cart.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "UPDATE_CART_ITEM",
      entity: "Cart",
      entityId: cart._id,
      metadata: {
        productId,
        quantity,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Cart updated",
      data: cart,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error updating cart",
      error: err.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item not in cart",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    await AuditLog.create({
      user: userId,
      role: "buyer",
      action: "REMOVE_FROM_CART",
      entity: "Cart",
      entityId: cart._id,
      metadata: {
        productId,
        quantity: existingItem.quantity,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Item removed",
      data: cart,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error removing item",
      error: err.message,
    });
  }
};