const buyerModel = require('../models/buyer.model');
const AuditLog = require('../models/auditLog');
const Cart = require("../models/addToCart.model");
const BuyerOrder = require("../models/buyerOrder.model");
const AddProduct = require('../models/addproduct.model')
const Wishlist = require('../models/wishlist.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateSerialNumber } = require('../utils/generateSerial');
const { westAfricaCountries, nigeriaStates } = require("../utils/location");
const { groupByVendor } = require('../utils/feedAlgorithm');
const mongoose = require("mongoose");

const saltRounds = 10;

exports.createUser = async (req, res) => {
  try {
    const { fullName, email, phoneNo, password } = req.body;

    if (!fullName || !email || !phoneNo || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await buyerModel.findOne({ email });
    if (existingUser) {
      console.log('User already exist')
      return res.status(400).send('User already exist... Try to login or use another ID(email)');
    };

    const hashPassword = await bcrypt.hash(password, saltRounds);

    const serialNo = await generateSerialNumber("buyer");

    const createAcc = new buyerModel({
      serialNumber: serialNo,
      fullName,
      email,
      phoneNo,
      password: hashPassword
    });

    await createAcc.save();

    await AuditLog.create({
      user: createAcc._id,
      role: 'buyer',
      action: 'REGISTER_ACCOUNT',
      entity: 'Buyer',
      entityId: createAcc._id,
      metadata: {
        email: createAcc.email
      }
    });

    return res.status(201).json({
      success: true,
      message: '🎉 User Account Created Successfully!.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error')
  };
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await buyerModel.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const confirmPassword = await bcrypt.compare(password, user.password);

    if (!confirmPassword) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    await AuditLog.create({
      user: user._id,
      role: 'buyer',
      action: 'LOG_IN',
      entity: 'Buyer',
      entityId: user._id,
      metadata: {
        email: user.email
      }
    });

    // const decoded = jwt.verify(token, process.env.JWT_KEY);
    // console.log(decoded);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token
    });


  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
};

exports.logoutUser = async (req, res) => {
  try {

    if (req.user?._id) {
      const user = await buyerModel.findById(req.user._id).select('email');

      await AuditLog.create({
        user: req.user._id,
        role: 'vendor',
        action: 'LOG_OUT',
        entity: 'Vendor',
        entityId: req.user._id,
        metadata: {
          email: user.email
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });


  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
};

exports.getUsersDetails = async (req, res) => {
  try {
    const buyer = await buyerModel
      .findById(req.user._id)
      .select(`
        serialNumber
        username
        fullName
        email
        phoneNo
        profilePhoto
        country
        state
        address
        preferredLanguage
        notificationPreferencess
      `);

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        identity: {
          id: buyer._id,
          serialNumber: buyer.serialNumber,
          username: buyer.username,
          fullName: buyer.fullName,
          profilePhoto: buyer.profilePhoto
        },
        contact: {
          email: buyer.email,
          phoneNo: buyer.phoneNo,
        },
        location: {
          country: buyer.country,
          state: buyer.state,
          address: buyer.address
        },
        preferences: {
          preferredLanguage: buyer.preferredLanguage,
          notificationPreferencess: buyer.notificationPreferencess
        },
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error"
    });
  }
};

exports.updateBuyerProfile = async (req, res) => {
  try {
    // console.log("Decoded ID from token:", req.user._id);
    // console.log("Type of ID:", typeof req.user._id);

    const buyerId = req.user._id;

    const {
      username,
      fullName,
      country,
      state,
      address,
      email,
      phoneNo,
      preferredLanguage,
      notificationPreferences,
    } = req.body;

    const buyer = await buyerModel.findById(buyerId);
    // console.log("Vendor from DB:", buyer);

    if (!buyer) {
      return res.status(404).json({ message: 'Buyer not found' });
    }

    // Validate country
    if (country && !westAfricaCountries.includes(country)) {
      return res.status(400).json({ message: 'Invalid country' });
    }

    // Validate state
    if (country === 'Nigeria' && state && !nigeriaStates.includes(state)) {
      return res.status(400).json({ message: 'Invalid Nigerian state' });
    }

    // Update fields
    if (username) buyer.username = username;
    if (fullName) buyer.fullName = fullName;
    if (country) buyer.country = country;
    if (state) buyer.state = state;
    if (address) buyer.address = address;

    if (email) buyer.email = email;
    if (phoneNo) buyer.phoneNo = phoneNo;
    if (address) buyer.address = address;

    if (preferredLanguage) buyer.preferredLanguage = preferredLanguage;
    if (notificationPreferences) buyer.notificationPreferences = notificationPreferences;

    // File uploads
    if (req.files?.profilePhoto) {
      buyer.profilePhoto = req.files.profilePhoto[0].path;
    }

    await buyer.save();

    await AuditLog.create({
      user: buyer._id,
      role: 'buyer',
      action: 'UPDATE_ACCOUNT',
      entity: 'Buyer',
      entityId: buyer._id,
      metadata: {
        serialNumber: buyer.serialNumber,
        email: buyer.email,
        phoneNo: buyer.phoneNo
      }
    });

    res.json({
      message: 'Profile updated successfully',
      data: buyer
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Server error' });
  }
};

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
    console.log(err)
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

exports.createBuyerOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    let {
      items,
      subtotal,
      deliveryFee,
      totalTax,
      orderTotal,
      delivery,
      paymentMethod,
      note,
      state,
      address,
    } = req.body;

    items = JSON.parse(items);

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const buyer = await buyerModel.findById(userId);
    if (!buyer) {
      return res.status(404).json({ message: "User not found" });
    }

    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await AddProduct.findById(item.id).select("vendor");

        return {
          ...item,
          vendorId: product?.vendor ? product.vendor.toString() : null,
        };
      })
    );

    const grouped = enrichedItems.reduce((acc, item) => {
      if (!item.vendorId) return acc;

      if (!acc[item.vendorId]) {
        acc[item.vendorId] = [];
      }

      acc[item.vendorId].push(item);
      return acc;
    }, {});

    const checkoutRef = new mongoose.Types.ObjectId();

    const allProofs = [];

    if (paymentMethod === "pay_now" && req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname.startsWith("proof_")) {
          const vid = file.fieldname.split("_")[1];

          allProofs.push({
            vendorId: vid,
            file: file.path, // Cloudinary URL
          });
        }
      });
    }


    const createdOrders = [];

    for (const vendorId of Object.keys(grouped)) {
      const vendorItems = grouped[vendorId];

      const formattedItems = await Promise.all(
        vendorItems.map(async (item) => {
          const product = await AddProduct.findById(item.id).populate(
            "vendor",
            "storeName"
          );

          return {
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            vendor: product?.vendor?._id || null,
            vendorName: product?.vendor?.storeName || "N/A",
          };
        })
      );

      const vendorSubtotal = vendorItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      const TAX_PER_VENDOR = 10;
      const vendorDeliveryFee = delivery === "express" ? 1000 : 0;
      const vendorTotal =
        vendorSubtotal + vendorDeliveryFee + TAX_PER_VENDOR;

      const vendorProof = allProofs.find(
        (p) => p.vendorId === vendorId
      );

      const order = await BuyerOrder.create({
        buyer: userId,
        vendor: vendorId,

        checkoutRef,

        items: formattedItems,

        pricing: {
          subtotal: vendorSubtotal,
          deliveryFee: vendorDeliveryFee,
          tax: TAX_PER_VENDOR,
          total: vendorTotal,
        },

        delivery: {
          method: delivery,
          address: address || buyer?.location?.address || "",
          state: state || buyer?.location?.state || "",
        },

        payment: {
          method: paymentMethod,
          status: "pending",
          proofs: vendorProof ? [vendorProof] : [],
        },

        note,
      });

      createdOrders.push(order);
    }

    await Cart.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } }
    );

    const isMultiVendor = createdOrders.length > 1;

    await AuditLog.create({
      user: userId,
      role: "buyer",
      action: isMultiVendor
        ? "CREATE_MULTI_VENDOR_ORDER"
        : "CREATE_ORDER",
      entity: "Order",

      metadata: {
        checkoutRef,
        orderCount: createdOrders.length,
        totalAmount: orderTotal,
        paymentMethod,
        deliveryMethod: delivery,

        vendorIds: Object.keys(grouped),
      },
    });

    res.status(201).json({
      success: true,
      message: "Orders created per vendor",
      data: createdOrders,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getBuyerOrders = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await BuyerOrder.find({ buyer: userId })
      .populate("items.vendor", "storeName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });

  } catch (error) {
    console.error("Fetch Orders Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
    });
  }
};

exports.getSingleBuyerOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;

    const order = await BuyerOrder.findOne({
      _id: orderId,
      buyer: userId,
    })
      .populate("items.vendor", "storeName");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error("Fetch Single Order Error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
    });
  }
};

exports.buyerConfirmDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "shipped") {
      return res.status(400).json({ message: "Order not yet shipped" });
    }

    const previousStatus = order.status;
    order.status = "delivered";

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "ORDER_DELIVERED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: "delivered",
        timestamp: Date.now()
      },
    });

    return res.json({
      message: "Order marked as delivered",
      status: order.status,
    });


  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.buyerCancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await BuyerOrder.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status !== "pending") {
      return res.status(400).json({ message: "Order cannot be cancelled now" });
    }

    const previousStatus = order.status;
    order.status = "cancelled";
    order.cancelledBy = {
      role: "buyer",
      user: req.user._id,
      cancelledAt: new Date(),
    };

    await order.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "ORDER_CANCELLED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        previousStatus,
        newStatus: "cancelled",
        cancelledBy: "buyer",
        timestamp: Date.now()
      },
    });

    return res.json({
      message: "Order cancelled",
      status: order.status,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { reason, details } = req.body;

    // Validation
    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reason is required for refund request",
      });
    }

    const order = await BuyerOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify ownership
    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request refund for your own orders",
      });
    }

    // Check if order is cancelled
    if (order.status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Refund request can only be made for cancelled orders",
      });
    }

    // Check if cancelled by buyer
    if (!order.cancelledBy || order.cancelledBy.role !== "buyer") {
      return res.status(400).json({
        success: false,
        message: "Refund request can only be made for orders cancelled by you",
      });
    }

    // Check if refund request already exists and is pending/approved/completed
    if (
      order.refundRequest.requested &&
      ["pending", "approved", "completed"].includes(order.refundRequest.status)
    ) {
      return res.status(400).json({
        success: false,
        message: `A refund request already exists with status: ${order.refundRequest.status}`,
      });
    }

    // Create/Update refund request
    order.refundRequest = {
      requested: true,
      status: "pending",
      reason,
      details: details || "",
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      response: "",
    };

    await order.save();

    await AuditLog.create({
      user: userId,
      role: "buyer",
      action: "REFUND_REQUEST_CREATED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        reason,
        orderStatus: order.status,
        totalAmount: order.pricing.total,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Refund request submitted successfully",
      data: {
        orderId: order._id,
        refundRequest: order.refundRequest,
      },
    });
  } catch (error) {
    console.error("Request Refund Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting refund request",
      error: error.message,
    });
  }
};

exports.requestReturn = async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { reason, details } = req.body;

    // Validation
    if (!reason || reason.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Reason is required for return request",
      });
    }

    const order = await BuyerOrder.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify ownership
    if (order.buyer.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only request return for your own orders",
      });
    }

    // Check if order is delivered
    if (order.status !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Return request can only be made for delivered orders",
      });
    }

    // Check if return request already exists and is pending/approved/completed
    if (
      order.returnRequest.requested &&
      ["pending", "approved", "completed"].includes(order.returnRequest.status)
    ) {
      return res.status(400).json({
        success: false,
        message: `A return request already exists with status: ${order.returnRequest.status}`,
      });
    }

    // Create/Update return request
    order.returnRequest = {
      requested: true,
      status: "pending",
      reason,
      details: details || "",
      requestedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      response: "",
    };

    await order.save();

    await AuditLog.create({
      user: userId,
      role: "buyer",
      action: "RETURN_REQUEST_CREATED",
      entity: "ORDER",
      entityId: orderId,
      metadata: {
        reason,
        orderStatus: order.status,
        totalAmount: order.pricing.total,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Return request submitted successfully",
      data: {
        orderId: order._id,
        returnRequest: order.returnRequest,
      },
    });
  } catch (error) {
    console.error("Request Return Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error submitting return request",
      error: error.message,
    });
  }
};

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: [],
      });
    }

    const alreadyExists = wishlist.items.find(
      item => item.product.toString() === productId
    );

    if (alreadyExists) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    wishlist.items.push({ product: productId });

    await wishlist.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "ADD_TO_WISHLIST",
      entity: "Wishlist",
      entityId: wishlist._id,
      metadata: {
        productId,
      },
    });

    res.json({
      success: true,
      message: 'Added to wishlist',
      data: wishlist,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add to wishlist' });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const productId = req.params.productId;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    const initialLength = wishlist.items.length;

    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );

    if (wishlist.items.length === initialLength) {
      return res.status(404).json({ message: 'Item not found in wishlist' });
    }

    await wishlist.save();

    await wishlist.populate('items.product');

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "REMOVE_FROM_WISHLIST",
      entity: "Wishlist",
      entityId: wishlist._id,
      metadata: {
        productId,
      },
    });

    res.json({
      success: true,
      message: 'Removed from wishlist',
      data: wishlist,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item' });
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.items = [];
    await wishlist.save();

    await AuditLog.create({
      user: req.user._id,
      role: "buyer",
      action: "CLEAR_WISHLIST",
      entity: "Wishlist",
      entityId: wishlist._id,
      metadata: {
        cleared: true,
      },
    });

    res.json({
      success: true,
      message: 'Wishlist cleared',
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear wishlist' });
  }
};

exports.getWishlist = async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('items.product');

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user._id,
        items: [],
      });
    }

    res.json({
      success: true,
      data: wishlist,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wishlist' });
  }
};

exports.getBuyerActivities = async (req, res) => {
  try {
    const logs = await AuditLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: logs
    });

  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch activities'
    });
  }
};