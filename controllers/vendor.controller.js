const vendorModel = require('../models/vendor.model');
const AddProduct = require('../models/addproduct.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const{ generateSerialNumber } = require('../utils/generateSerial');

const saltRounds = 10;

exports.createUser = async (req, res) => {
    try {
        const { fullName, email, phoneNo, password } = req.body;
        
        if (!fullName || !email || !phoneNo || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        const existingUser = await vendorModel.findOne({ email });
        if (existingUser) {
            console.log('User already exist')
            return res.status(400).send('User already exist... Try to login or use another ID(email)');
        };
        
        const hashPassword = await bcrypt.hash(password, saltRounds);
        
        const serialNo = await generateSerialNumber("vendor");

        const createAcc = new vendorModel({
            serialNumber: serialNo,
            fullName,
            email,
            phoneNo,
            password: hashPassword
        });

        await createAcc.save();

        return res.status(201).json({
            success: true,
            message: '🎉 User Account Created Successfully!.',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error')
    };
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await vendorModel.findOne({ email }).select('+password');

        if (!user) {
            console.log('User not found');
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        };

        const confirmPassword = await bcrypt.compare(password, user.password);
        if (!confirmPassword) {
            console.log('Password not match');
            return res.status(400).json({ success: false, message: "Invalid credentials" });
        };

        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_KEY,
            { expiresIn: "7d" }
        );

        // const userDetails = {
        //     _id: user._id,
        //     serialNumber: user.serialNumber,
        //     fullName: user.fullName,
        //     email: user.email,
        //     phoneNo: user.phoneNo
        // };

        return res.status(200).json({
            success: true,
            message: "🎉 User Login Successfully!.",
            token,
            // data: userDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send('Internal Server Error');
    };
};

exports.getUsersDetails = async (req, res) => {
    try {
        const profile = await vendorModel
            .findById(req.user._id)
            .select('serialNumber fullName email phoneNo');

        if (!profile) {
            console.log('User not found');
            return res.status(404).send('User not found');
        };

        return res.status(200).json({
            success: true,
            data: profile
        });
    } catch(err){
        console.error(err);
       return res.status(500).send('Internal Server Error ' + err)
    }
};

exports.addProduct = async (req, res) => {
  try {
    const { name, description, category, price, originalPrice, stock, imageUrl } = req.body;

    if (!name || !category || !price || !stock) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

    // Handle image
    let image = null;

    if (req.file) {
      image = req.file.path;
    } else if (imageUrl) {
      image = imageUrl;
    } else {
      return res.status(400).json({
        success: false,
        message: "Provide an image file or image URL"
      });
    }

    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      return res.status(400).json({
        success: false,
        message: "Price and stock must be valid numbers"
      });
    }

    let status = "in-stock";
    if (parsedStock === 0) status = "out-of-stock";
    else if (parsedStock <= 5) status = "low-in-stock";

    const product = await AddProduct.create({
      vendor: req.user._id,
      name,
      description,
      image,
      category,
      price: parsedPrice,
      originalPrice: originalPrice || parsedPrice,
      stock: parsedStock,
      status
    });

    return res.status(201).json({
      success: true,
      message: "Product added successfully",
      data: product
    });

  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getVendorProducts = async (req, res) => {
  try {
    const vendorId = req.user._id;

    const products = await AddProduct.find({ vendor: vendorId });
    
    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found for this vendor"
      });
    }

    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const products = await AddProduct.find();

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found"
      });
    }

    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const vendorId = req.user._id;

    const product = await AddProduct.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    // check ownership
    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const { name, description, category, price, stock } = req.body;

    // update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (category) product.category = category;
    if (price) product.price = Number(price);
    if (stock) product.stock = Number(stock);

    // update status from stock
    if (stock !== undefined) {
      if (product.stock === 0) product.status = "out-of-stock";
      else if (product.stock <= 5) product.status = "low-in-stock";
      else product.status = "in-stock";
    }

    // update image if new one is uploaded
    if (req.file) {
      product.image = req.file.path;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const vendorId = req.user?._id || req.userId;

    const product = await AddProduct.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    if (product.vendor.toString() !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized"
      });
    }

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (err) {
    console.error("DELETE ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message
    });
  }
};  