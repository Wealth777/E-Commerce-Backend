const AuditLog = require('../../models(Copy)/auditLog');
const Wishlist = require('../../models(Copy)/wishlist.model');

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