// const vendorModel = require('../models/vendor.model');
// const AddProduct = require('../models/addproduct.model')
// const AuditLog = require('../models/auditLog')
// const BuyerOrder = require("../models/buyerOrder.model");
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const PDFDocument = require("pdfkit");
// const { generateSerialNumber } = require('../utils/generateSerial');
// const { westAfricaCountries, nigeriaStates } = require("../utils/location");
// const { groupProductsByVendor, buildInterleavedFeed, validateLimit, updateProductStockAfterOrder, getDateRange } = require('../utils/feedAlgorithm');

// const saltRounds = 10;

// exports.createUser = async (req, res) => {
//   try {
//     const { fullName, email, phoneNo, password } = req.body;

//     if (!fullName || !email || !phoneNo || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const existingUser = await vendorModel.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const hashPassword = await bcrypt.hash(password, saltRounds);
//     const serialNo = await generateSerialNumber("vendor");

//     const createAcc = new vendorModel({
//       serialNumber: serialNo,
//       fullName,
//       email,
//       phoneNo,
//       password: hashPassword
//     });

//     await createAcc.save();

//     await AuditLog.create({
//       user: createAcc._id,
//       role: 'vendor',
//       action: 'REGISTER_ACCOUNT',
//       entity: 'Vendor',
//       entityId: createAcc._id,
//       metadata: {
//         email: createAcc.email
//       }
//     });


//     return res.status(201).json({
//       success: true,
//       message: 'User Account Created Successfully'
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).send('Internal Server Error');
//   }
// };

// exports.loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//     }

//     const user = await vendorModel.findOne({ email });

//     if (!user) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const confirmPassword = await bcrypt.compare(password, user.password);

//     if (!confirmPassword) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = jwt.sign(
//       { id: user._id },
//       process.env.JWT_KEY,
//       { expiresIn: "7d" }
//     );

//     await AuditLog.create({
//       user: user._id,
//       role: 'vendor',
//       action: 'LOG_IN',
//       entity: 'Vendor',
//       entityId: user._id,
//       metadata: {
//         email: user.email
//       }
//     });

//     // const decoded = jwt.verify(token, process.env.JWT_KEY);
//     // console.log(decoded);

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token
//     });


//   } catch (err) {
//     console.error(err);
//     return res.status(500).send('Internal Server Error');
//   }
// };

// exports.logoutUser = async (req, res) => {
//   try {

//     if (req.user?._id) {
//       const user = await vendorModel.findById(req.user._id).select('email');

//       await AuditLog.create({
//         user: req.user._id,
//         role: 'vendor',
//         action: 'LOG_OUT',
//         entity: 'Vendor',
//         entityId: req.user._id,
//         metadata: {
//           email: user.email
//         }
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Logout successful"
//     });


//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Logout failed"
//     });
//   }
// };

// exports.getUsersDetails = async (req, res) => {
//   try {
//     const vendor = await vendorModel
//       .findById(req.user._id)
//       .select(`
//         serialNumber
//         username
//         fullName
//         email
//         phoneNo
//         profilePhoto
//         country
//         state
//         businessAddress
//         supportContact
//         storeName
//         storeDescription
//         bannerImage
//         socialLinks
//         preferredLanguage
//         notificationPreferencess
//         bankName
//         accountName
//         accountNumber
//       `);

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: {
//         identity: {
//           id: vendor._id,
//           serialNumber: vendor.serialNumber,
//           username: vendor.username,
//           fullName: vendor.fullName,
//           profilePhoto: vendor.profilePhoto
//         },
//         contact: {
//           email: vendor.email,
//           phoneNo: vendor.phoneNo,
//           businessAddress: vendor.businessAddress,
//           supportContact: vendor.supportContact
//         },
//         location: {
//           country: vendor.country,
//           state: vendor.state
//         },
//         store: {
//           storeName: vendor.storeName,
//           storeDescription: vendor.storeDescription,
//           bannerImage: vendor.bannerImage
//         },
//         preferences: {
//           preferredLanguage: vendor.preferredLanguage,
//           notificationPreferencess: vendor.notificationPreferencess
//         },
//         socialLinks: vendor.socialLinks,
//         payout: {
//           bankName: vendor.bankName,
//           accountName: vendor.accountName,
//           accountNumber: vendor.accountNumber,
//         }
//       }
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error"
//     });
//   }
// };

// exports.updateVendorProfile = async (req, res) => {
//   try {
//     // console.log("Decoded ID from token:", req.user._id);
//     // console.log("Type of ID:", typeof req.user._id);

//     const vendorId = req.user._id;

//     const {
//       username,
//       fullName,
//       country,
//       state,
//       email,
//       phoneNo,
//       address,
//       password,
//       supportContact,
//       storeName,
//       storeDescription,
//       preferredLanguage,
//       notificationPreferences,
//       facebook,
//       instagram,
//       x
//     } = req.body;

//     const vendor = await vendorModel.findById(vendorId);
//     // console.log("Vendor from DB:", vendor);

//     if (!vendor) {
//       return res.status(404).json({ message: 'Vendor not found' });
//     }

//     // Validate country
//     if (country && !westAfricaCountries.includes(country)) {
//       return res.status(400).json({ message: 'Invalid country' });
//     }

//     // Validate state
//     if (country === 'Nigeria' && state && !nigeriaStates.includes(state)) {
//       return res.status(400).json({ message: 'Invalid Nigerian state' });
//     }

//     // Update fields
//     if (username) vendor.username = username;
//     if (fullName) vendor.fullName = fullName;
//     if (country) vendor.country = country;
//     if (state) vendor.state = state;

//     if (email) vendor.email = email;
//     if (phoneNo) vendor.phoneNo = phoneNo;
//     if (address) vendor.address = address;
//     if (supportContact) vendor.supportContact = supportContact;

//     if (storeName) vendor.storeName = storeName;
//     if (storeDescription) vendor.storeDescription = storeDescription;

//     if (preferredLanguage) vendor.preferredLanguage = preferredLanguage;
//     if (notificationPreferences) vendor.notificationPreferences = notificationPreferences;

//     // socialLinks
//     vendor.socialLinks = {
//       facebook: facebook || vendor.socialLinks?.facebook,
//       instagram: instagram || vendor.socialLinks?.instagram,
//       x: x || vendor.socialLinks?.x
//     };

//     // Password update
//     if (password) {
//       const hash = await bcrypt.hash(password, saltRounds);
//       vendor.password = hash; // FIXED
//     }

//     // File uploads
//     if (req.files?.profilePhoto) {
//       vendor.profilePhoto = req.files.profilePhoto[0].path;
//     }

//     if (req.files?.bannerImage) {
//       vendor.bannerImage = req.files.bannerImage[0].path;
//     }

//     await vendor.save();

//     await AuditLog.create({
//       user: vendor._id,
//       role: 'vendor',
//       action: 'UPDATE_ACCOUNT',
//       entity: 'Vendor',
//       entityId: vendor._id,
//       metadata: {
//         serialNumber: vendor.serialNumber,
//         email: vendor.email,
//         phoneNo: vendor.phoneNo
//       }
//     });

//     res.json({
//       message: 'Profile updated successfully',
//       data: vendor
//     });

//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// exports.addProduct = async (req, res) => {
//   try {
//     const { name, description, category, price, originalPrice, stock, imageUrl } = req.body;

//     if (!name || !category || !price || !stock) {
//       return res.status(400).json({
//         success: false,
//         message: "All required fields must be filled"
//       });
//     }

//     // Handle image
//     let image = null;

//     if (req.file) {
//       image = req.file.path;
//     } else if (imageUrl) {
//       image = imageUrl;
//     } else {
//       return res.status(400).json({
//         success: false,
//         message: "Provide an image file or image URL"
//       });
//     }

//     const parsedPrice = Number(price);
//     const parsedStock = Number(stock);

//     if (isNaN(parsedPrice) || isNaN(parsedStock)) {
//       return res.status(400).json({
//         success: false,
//         message: "Price and stock must be valid numbers"
//       });
//     }

//     let status = "in-stock";
//     if (parsedStock === 0) status = "out-of-stock";
//     else if (parsedStock <= 5) status = "low-in-stock";

//     const product = await AddProduct.create({
//       vendor: req.user._id,
//       name,
//       description,
//       image,
//       category,
//       price: parsedPrice,
//       originalPrice: originalPrice || parsedPrice,
//       stock: parsedStock,
//       status
//     });

//     await AuditLog.create({
//       user: req.user._id,
//       role: 'vendor',
//       action: 'ADD_PRODUCT',
//       entity: 'Product',
//       entityId: product._id,
//       metadata: {
//         name: product.name,
//         price: product.price
//       }
//     });


//     return res.status(201).json({
//       success: true,
//       message: "Product added successfully",
//       data: product
//     });

//   } catch (err) {
//     console.error("ADD PRODUCT ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: err.message
//     });
//   }
// };

// exports.getVendorProducts = async (req, res) => {
//   try {
//     const vendorId = req.user._id;

//     const products = await AddProduct.find({ vendor: vendorId });

//     if (!products || products.length === 0) {
//       return res.status(200).json({
//         success: true,
//         data: products || []
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: products
//     });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ success: false, message: "Internal Server Error", error: err.message });
//   }
// };

// exports.getAllProducts = async (req, res) => {
//   try {
//     const limit = validateLimit(req.query.limit);

//     const products = await AddProduct.find()
//       .populate("vendor", "storeName profilePhoto country state");

//     if (!products || products.length === 0) {
//       return res.status(200).json({
//         success: true,
//         count: 0,
//         totalProducts: 0,
//         data: []
//       });
//     }

//     const vendorGroups = groupProductsByVendor(products);
//     const interleavedFeed = buildInterleavedFeed(vendorGroups, limit);

//     if (req.user?._id) {
//       await AuditLog.create({
//         user: req.user._id,
//         role: req.user.role || 'buyer',
//         action: 'VIEW_PRODUCT_FEED',
//         entity: 'Feed',
//         entityId: null,
//         metadata: {
//           limit,
//           productsReturned: interleavedFeed.length,
//           totalProducts: products.length,
//           vendorsCount: Object.keys(vendorGroups).length
//         }
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       count: interleavedFeed.length,
//       totalProducts: products.length,
//       data: interleavedFeed
//     });

//   } catch (err) {
//     console.error("GET ALL PRODUCTS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.updateProduct = async (req, res) => {
//   try {
//     const productId = req.params.id;
//     const vendorId = req.user._id;

//     const product = await AddProduct.findById(productId);

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found"
//       });
//     }

//     if (product.vendor.toString() !== vendorId) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized"
//       });
//     }

//     const { name, description, category, price, stock, imageUrl } = req.body;

//     if (name) product.name = name;
//     if (description) product.description = description;
//     if (category) product.category = category;
//     if (price) product.price = Number(price);
//     if (stock) product.stock = Number(stock);
//     if (imageUrl) product.imageUrl = imageUrl;

//     if (stock !== undefined) {
//       if (product.stock === 0) product.status = "out-of-stock";
//       else if (product.stock <= 5) product.status = "low-in-stock";
//       else product.status = "in-stock";
//     }

//     if (req.file) {
//       product.image = req.file.path;
//     } else if (imageUrl) {
//       product.image = imageUrl;
//     }

//     await product.save();

//     await AuditLog.create({
//       user: req.user._id,
//       role: 'vendor',
//       action: 'UPDATE_PRODUCT',
//       entity: 'Product',
//       entityId: product._id
//     });


//     return res.status(200).json({
//       success: true,
//       message: "Product updated successfully",
//       product
//     });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.deleteProduct = async (req, res) => {
//   try {
//     const productId = req.params.id;
//     const vendorId = req.user?._id || req.userId;

//     const product = await AddProduct.findById(productId);

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found"
//       });
//     }

//     if (product.vendor.toString() !== vendorId) {
//       return res.status(403).json({
//         success: false,
//         message: "Unauthorized"
//       });
//     }

//     await product.deleteOne();

//     await AuditLog.create({
//       user: req.user._id,
//       role: 'vendor',
//       action: 'DELETE_PRODUCT',
//       entity: 'Product',
//       entityId: productId
//     });


//     return res.status(200).json({
//       success: true,
//       message: "Product deleted successfully"
//     });

//   } catch (err) {
//     console.error("DELETE ERROR:", err.message);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.getProductDetails = async (req, res) => {
//   try {
//     const { productId } = req.params;

//     const product = await AddProduct.findById(productId)
//       .populate("vendor", "serialNumber fullName storeName storeDescription profilePhoto country state socialLinks");

//     if (!product) {
//       return res.status(404).json({
//         success: false,
//         message: "Product not found"
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       data: {
//         product: {
//           id: product._id,
//           name: product.name,
//           description: product.description,
//           image: product.image,
//           category: product.category,
//           price: product.price,
//           originalPrice: product.originalPrice,
//           discount: product.originalPrice ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0,
//           stock: product.stock,
//           status: product.status,
//           createdAt: product.createdAt,
//           updatedAt: product.updatedAt
//         },
//         vendor: {
//           id: product.vendor._id,
//           serialNumber: product.vendor.serialNumber,
//           fullName: product.vendor.fullName,
//           storeName: product.vendor.storeName,
//           storeDescription: product.vendor.storeDescription,
//           profilePhoto: product.vendor.profilePhoto,
//           location: {
//             country: product.vendor.country,
//             state: product.vendor.state
//           },
//           socialLinks: product.vendor.socialLinks
//         }
//       }
//     });

//   } catch (err) {
//     console.error("GET PRODUCT DETAILS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.getVendorDetails = async (req, res) => {
//   try {
//     const { id: vendorId } = req.params;
//     const { category, status, sortBy } = req.query;

//     const filterQuery = { vendor: vendorId };

//     if (category) filterQuery.category = category;
//     if (status) filterQuery.status = status;

//     let sortQuery = { createdAt: -1 };

//     if (sortBy === 'price-asc') sortQuery = { price: 1 };
//     if (sortBy === 'price-desc') sortQuery = { price: -1 };
//     if (sortBy === 'newest') sortQuery = { createdAt: -1 };
//     if (sortBy === 'stock') sortQuery = { stock: -1 };

//     const vendordetails = await vendorModel.findById(vendorId).select(
//       "serialNumber fullName storeName storeDescription profilePhoto bannerImage country state email phoneNo socialLinks rating reviews isVerified"
//     );

//     if (!vendordetails) {
//       return res.status(404).json({
//         success: false,
//         message: "Vendor not found"
//       });
//     }

//     const products = await AddProduct.find(filterQuery).sort(sortQuery);

//     const productList = products.map(product => ({
//       id: product._id,
//       name: product.name,
//       description: product.description,
//       image: product.image,
//       category: product.category,
//       price: product.price,
//       originalPrice: product.originalPrice,
//       discount: product.originalPrice
//         ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
//         : 0,
//       stock: product.stock,
//       status: product.status,
//       createdAt: product.createdAt
//     }));

//     return res.status(200).json({
//       success: true,
//       count: products.length,
//       vendorInfo: {
//         id: vendordetails._id,
//         serialNumber: vendordetails.serialNumber,
//         fullName: vendordetails.fullName,
//         storeName: vendordetails.storeName,
//         storeDescription: vendordetails.storeDescription,
//         profilePhoto: vendordetails.profilePhoto,
//         bannerImage: vendordetails.bannerImage,
//         country: vendordetails.country,
//         state: vendordetails.state,
//         email: vendordetails.email,
//         phoneNo: vendordetails.phoneNo,
//         socialLinks: vendordetails.socialLinks
//       },
//       products: productList
//     });

//   } catch (err) {
//     console.error("GET VENDOR PRODUCT DETAILS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.getVendorProductsByCategory = async (req, res) => {
//   try {
//     const { vendorId, category } = req.params;

//     if (!category) {
//       return res.status(400).json({
//         success: false,
//         message: "Category is required"
//       });
//     }

//     const products = await AddProduct.find({
//       vendor: vendorId,
//       category: { $regex: category, $options: 'i' }
//     })
//       .sort({ createdAt: -1 })
//       .populate("vendor", "fullName storeName profilePhoto country state");

//     if (!products || products.length === 0) {
//       return res.status(200).json({
//         success: true,
//         count: 0,
//         data: [],
//         message: "No products found in this category"
//       });
//     }

//     const vendor = products[0].vendor;

//     const productList = products.map(product => ({
//       id: product._id,
//       name: product.name,
//       description: product.description,
//       image: product.image,
//       price: product.price,
//       originalPrice: product.originalPrice,
//       stock: product.stock,
//       status: product.status
//     }));

//     return res.status(200).json({
//       success: true,
//       count: products.length,
//       category,
//       vendor: {
//         id: vendor._id,
//         fullName: vendor.fullName,
//         storeName: vendor.storeName
//       },
//       products: productList
//     });

//   } catch (err) {
//     console.error("GET VENDOR PRODUCTS BY CATEGORY ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.searchVendorProducts = async (req, res) => {
//   try {
//     const { vendorId } = req.params;
//     const { q, category, minPrice, maxPrice } = req.query;

//     if (!q) {
//       return res.status(400).json({
//         success: false,
//         message: "Search query is required"
//       });
//     }

//     // Build filter query
//     const filterQuery = {
//       vendor: vendorId,
//       $or: [
//         { name: { $regex: q, $options: 'i' } },
//         { description: { $regex: q, $options: 'i' } },
//         { category: { $regex: q, $options: 'i' } }
//       ]
//     };

//     // Add price filter if provided
//     if (minPrice || maxPrice) {
//       filterQuery.price = {};
//       if (minPrice) filterQuery.price.$gte = Number(minPrice);
//       if (maxPrice) filterQuery.price.$lte = Number(maxPrice);
//     }

//     // Add category filter if provided
//     if (category) {
//       filterQuery.category = category;
//     }

//     const products = await AddProduct.find(filterQuery)
//       .sort({ createdAt: -1 })
//       .populate("vendor", "fullName storeName profilePhoto");

//     if (!products || products.length === 0) {
//       return res.status(200).json({
//         success: true,
//         count: 0,
//         data: [],
//         message: "No products found matching your search"
//       });
//     }

//     const vendor = products[0].vendor;

//     const productList = products.map(product => ({
//       id: product._id,
//       name: product.name,
//       description: product.description,
//       image: product.image,
//       category: product.category,
//       price: product.price,
//       originalPrice: product.originalPrice,
//       stock: product.stock,
//       status: product.status,
//       relevance: "search-match"
//     }));

//     return res.status(200).json({
//       success: true,
//       count: products.length,
//       searchQuery: q,
//       filters: { category, minPrice, maxPrice },
//       vendor: {
//         id: vendor._id,
//         fullName: vendor.fullName,
//         storeName: vendor.storeName
//       },
//       products: productList
//     });

//   } catch (err) {
//     console.error("SEARCH VENDOR PRODUCTS ERROR:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Internal Server Error",
//       error: err.message
//     });
//   }
// };

// exports.saveVendorPayout = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const {
//       bankName,
//       accountName,
//       accountNumber,
//     } = req.body;

//     if (accountNumber.length !== 10) {
//       return res.status(400).json({
//         success: false,
//         message: 'Account number must be 10 digits'
//       });
//     }

//     const vendor = await vendorModel.findById(userId);

//     if (bankName) vendor.bankName = bankName;
//     if (accountName) vendor.accountName = accountName;
//     if (accountNumber) vendor.accountNumber = accountNumber;

//     if (!vendor) {
//       return res.status(404).json({
//         success: false,
//         message: 'Vendor not found'
//       });
//     }

//     await vendor.save();

//     await AuditLog.create({
//       user: req.user._id,
//       role: 'vendor',
//       action: 'UPDATE_PAYOUT',
//       entity: 'Vendor'
//     });


//     return res.status(200).json({
//       success: true,
//       message: 'Payout details saved successfully',
//       data: vendor
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// exports.getVendorOrders = async (req, res) => {
//   try {
//     const vendorId = req.user._id;

//     const orders = await BuyerOrder.find({ vendor: vendorId })
//       .populate("buyer", "username email")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: orders.length,
//       data: orders,
//     });

//   } catch (error) {
//     console.error("Fetch Vendor Orders Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching vendor orders",
//     });
//   }
// };

// exports.getSingleVendorOrder = async (req, res) => {
//   try {
//     const vendorId = req.user._id;
//     const { orderId } = req.params;

//     const order = await BuyerOrder.findOne({
//       _id: orderId,
//       vendor: vendorId,
//     })
//       .populate("buyer", "username email")
//       .populate("items.productId", "name image");

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: order,
//     });

//   } catch (error) {
//     console.error("Fetch Single Vendor Order Error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Error fetching order",
//     });
//   }
// };

// exports.vendorConfirmPayment = async (req, res) => {
//   try {
//     const { orderId, status } = req.body;

//     const allowed = ["paid", "failed"];
//     if (!allowed.includes(status)) {
//       return res.status(400).json({ message: "Invalid payment status" });
//     }

//     const order = await BuyerOrder.findById(orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     order.payment.status = status;

//     await order.save();

//     await AuditLog.create({
//       user: req.user._id,
//       role: "vendor",
//       action: "PAYMENT_STATUS_UPDATED",
//       entity: "ORDER",
//       entityId: orderId,
//       metadata: {
//         previousStatus: order.payment.status,
//         newStatus: status,
//         timestamp: Date.now()
//       },
//     });

//     return res.json({
//       message: "Payment status updated",
//       payment: order.payment.status,
//     });


//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.vendorConfirmOrder = async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     const order = await BuyerOrder.findById(orderId);

//     if (!order) {
//       return res.status(404).json({
//         message: "Order not found"
//       });
//     }

//     if (order.status !== "pending") {
//       return res.status(400).json({
//         message: "Order already processed"
//       });
//     }

//     if (order.payment.method === "pay_now" && order.payment.status !== "paid") {
//       return res.status(400).json({
//         message: "Payment must be confirmed first"
//       });
//     }

//     await updateProductStockAfterOrder(order.items);

//     const previousStatus = order.status;
//     order.status = "confirmed";

//     await order.save();

//     await AuditLog.create({
//       user: req.user._id,
//       role: "vendor",
//       action: "ORDER_CONFIRMED",
//       entity: "ORDER",
//       entityId: orderId,
//       metadata: {
//         previousStatus,
//         newStatus: "confirmed",
//         timestamp: Date.now()
//       }
//     });

//     return res.json({
//       message: "Order confirmed and stock updated",
//       status: order.status
//     });

//   } catch (err) {
//     return res.status(500).json({
//       message: err.message
//     });
//   }
// };

// exports.vendorShipOrder = async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     const order = await BuyerOrder.findById(orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     if (order.status !== "confirmed") {
//       return res.status(400).json({ message: "Order must be confirmed first" });
//     }

//     const previousStatus = order.status;
//     order.status = "shipped";

//     await order.save();

//     await AuditLog.create({
//       user: req.user._id,
//       role: "vendor",
//       action: "ORDER_SHIPPED",
//       entity: "ORDER",
//       entityId: orderId,
//       metadata: {
//         previousStatus,
//         newStatus: "shipped",
//         timestamp: Date.now()
//       },
//     });

//     return res.json({
//       message: "Order marked as shipped",
//       status: order.status,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: err.message });
//   }
// };

// exports.getRefundRequests = async (req, res) => {
//   try {
//     const vendorId = req.user._id;

//     const orders = await BuyerOrder.find({
//       vendor: vendorId,
//       "refundRequest.requested": true,
//     })
//       .populate("buyer", "username email fullName")
//       .sort({ "refundRequest.requestedAt": -1 });

//     const refundRequests = orders
//       .filter((order) => order.refundRequest.requested)
//       .map((order) => ({
//         orderId: order._id,
//         buyerInfo: {
//           id: order.buyer._id,
//           username: order.buyer.username,
//           email: order.buyer.email,
//           fullName: order.buyer.fullName,
//         },
//         orderStatus: order.status,
//         pricing: order.pricing,
//         refundRequest: order.refundRequest,
//       }));

//     return res.status(200).json({
//       success: true,
//       count: refundRequests.length,
//       data: refundRequests,
//     });
//   } catch (error) {
//     console.error("Get Refund Requests Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching refund requests",
//       error: error.message,
//     });
//   }
// };

// exports.getReturnRequests = async (req, res) => {
//   try {
//     const vendorId = req.user._id;

//     const orders = await BuyerOrder.find({
//       vendor: vendorId,
//       "returnRequest.requested": true,
//     })
//       .populate("buyer", "username email fullName")
//       .sort({ "returnRequest.requestedAt": -1 });

//     const returnRequests = orders
//       .filter((order) => order.returnRequest.requested)
//       .map((order) => ({
//         orderId: order._id,
//         buyerInfo: {
//           id: order.buyer._id,
//           username: order.buyer.username,
//           email: order.buyer.email,
//           fullName: order.buyer.fullName,
//         },
//         orderStatus: order.status,
//         pricing: order.pricing,
//         returnRequest: order.returnRequest,
//       }));

//     return res.status(200).json({
//       success: true,
//       count: returnRequests.length,
//       data: returnRequests,
//     });
//   } catch (error) {
//     console.error("Get Return Requests Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error fetching return requests",
//       error: error.message,
//     });
//   }
// };

// exports.reviewRefundRequest = async (req, res) => {
//   try {
//     const vendorId = req.user._id;
//     const { orderId } = req.params;
//     const { action, response } = req.body;

//     // Validation
//     if (!action || !["approved", "rejected"].includes(action)) {
//       return res.status(400).json({
//         success: false,
//         message: "Action must be either 'approved' or 'rejected'",
//       });
//     }

//     if (action === "rejected" && (!response || response.trim() === "")) {
//       return res.status(400).json({
//         success: false,
//         message: "Response message is required when rejecting refund request",
//       });
//     }

//     const order = await BuyerOrder.findOne({
//       _id: orderId,
//       vendor: vendorId,
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found or you do not have permission",
//       });
//     }

//     if (!order.refundRequest.requested) {
//       return res.status(400).json({
//         success: false,
//         message: "No refund request found for this order",
//       });
//     }

//     if (order.refundRequest.status !== "pending") {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot review refund request with status: ${order.refundRequest.status}`,
//       });
//     }

//     // Update refund request
//     order.refundRequest.status = action === "approved" ? "approved" : "rejected";
//     order.refundRequest.reviewedAt = new Date();
//     order.refundRequest.reviewedBy = vendorId;
//     order.refundRequest.response = response || "";

//     await order.save();

//     await AuditLog.create({
//       user: vendorId,
//       role: "vendor",
//       action: `REFUND_REQUEST_${action.toUpperCase()}`,
//       entity: "ORDER",
//       entityId: orderId,
//       metadata: {
//         buyerId: order.buyer,
//         reason: order.refundRequest.reason,
//         totalAmount: order.pricing.total,
//         response,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: `Refund request ${action}`,
//       data: {
//         orderId: order._id,
//         refundRequest: order.refundRequest,
//       },
//     });
//   } catch (error) {
//     console.error("Review Refund Request Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error reviewing refund request",
//       error: error.message,
//     });
//   }
// };

// exports.reviewReturnRequest = async (req, res) => {
//   try {
//     const vendorId = req.user._id;
//     const { orderId } = req.params;
//     const { action, response } = req.body;

//     // Validation
//     if (!action || !["approved", "rejected"].includes(action)) {
//       return res.status(400).json({
//         success: false,
//         message: "Action must be either 'approved' or 'rejected'",
//       });
//     }

//     if (action === "rejected" && (!response || response.trim() === "")) {
//       return res.status(400).json({
//         success: false,
//         message: "Response message is required when rejecting return request",
//       });
//     }

//     const order = await BuyerOrder.findOne({
//       _id: orderId,
//       vendor: vendorId,
//     });

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found or you do not have permission",
//       });
//     }

//     if (!order.returnRequest.requested) {
//       return res.status(400).json({
//         success: false,
//         message: "No return request found for this order",
//       });
//     }

//     if (order.returnRequest.status !== "pending") {
//       return res.status(400).json({
//         success: false,
//         message: `Cannot review return request with status: ${order.returnRequest.status}`,
//       });
//     }

//     // Update return request
//     order.returnRequest.status = action === "approved" ? "approved" : "rejected";
//     order.returnRequest.reviewedAt = new Date();
//     order.returnRequest.reviewedBy = vendorId;
//     order.returnRequest.response = response || "";

//     await order.save();

//     await AuditLog.create({
//       user: vendorId,
//       role: "vendor",
//       action: `RETURN_REQUEST_${action.toUpperCase()}`,
//       entity: "ORDER",
//       entityId: orderId,
//       metadata: {
//         buyerId: order.buyer,
//         reason: order.returnRequest.reason,
//         totalAmount: order.pricing.total,
//         response,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: `Return request ${action}`,
//       data: {
//         orderId: order._id,
//         returnRequest: order.returnRequest,
//       },
//     });
//   } catch (error) {
//     console.error("Review Return Request Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Error reviewing return request",
//       error: error.message,
//     });
//   }
// };

// exports.getVendorAnalytics = async (req, res) => {
//   try {
//     const vendorId = req.user._id;
//     const range = req.query.range || "7days";

//     const startDate = getDateRange(range);

//     const orders = await BuyerOrder.find({
//       vendor: vendorId,
//       createdAt: { $gte: startDate },
//       "payment.status": "paid"
//     })
//       .populate("buyer", "username email")
//       .sort({ createdAt: -1 });

//     const totalSales = orders.reduce(
//       (sum, order) => sum + (order.pricing?.total || 0),
//       0
//     );
//     const totalOrders = orders.length;

//     const avgOrderValue =
//       totalOrders > 0
//         ? Math.round(totalSales / totalOrders)
//         : 0;

//     const recentOrders = orders.slice(0, 5);

//     const topProducts = await AddProduct.find({
//       vendor: vendorId
//     })
//       .sort({ sold: -1 })
//       .limit(5)
//       .select("name image price sold stock");

//     const salesOverviewMap = {};

//     orders.forEach((order) => {
//       const date = order.createdAt.toISOString().split("T")[0];

//       if (!salesOverviewMap[date]) {
//         salesOverviewMap[date] = 0;
//       }

//       salesOverviewMap[date] += (order.pricing?.total || 0);
//     });

//     const salesOverview = Object.keys(salesOverviewMap).map((date) => ({
//       date,
//       sales: salesOverviewMap[date]
//     }));

//     res.status(200).json({
//       success: true,
//       summary: {
//         totalSales,
//         totalOrders,
//         avgOrderValue
//       },
//       salesOverview,
//       recentOrders,
//       topProducts
//     });
//   } catch (error) {
//     console.log("Vendor Analytics Error:", error);

//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch analytics"
//     });
//   }
// };

// exports.exportVendorAnalyticsPDF = async (req, res) => {
//   try {
//     const vendorId = req.user._id;
//     const range = req.query.range || "7days";

//     const startDate = getDateRange(range);

//     const orders = await BuyerOrder.find({
//       vendor: vendorId,
//       createdAt: { $gte: startDate },
//       "payment.status": "paid",
//     })
//       .populate("buyer", "username email")
//       .sort({ createdAt: -1 });

//     const totalSales = orders.reduce(
//       (sum, order) => sum + (order.pricing?.total || 0),
//       0
//     );

//     const totalOrders = orders.length;

//     const avgOrderValue =
//       totalOrders > 0
//         ? Math.round(totalSales / totalOrders)
//         : 0;

//     const topProducts = await AddProduct.find({
//       vendor: vendorId,
//     })
//       .sort({ sold: -1 })
//       .limit(5)
//       .select("name price sold stock");

//     res.setHeader(
//       "Content-Type",
//       "application/pdf"
//     );

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=vendor-analytics-${range}.pdf`
//     );

//     const doc = new PDFDocument({
//       margin: 50,
//       size: "A4",
//     });

//     doc.pipe(res);

//     // Title
//     doc
//       .fontSize(20)
//       .text("Vendor Analytics Report", {
//         align: "center",
//       });

//     doc.moveDown();

//     doc
//       .fontSize(12)
//       .text(`Date Range: ${range}`);

//     doc.text(
//       `Generated On: ${new Date().toLocaleString()}`
//     );

//     doc.moveDown();

//     // Summary Section
//     doc
//       .fontSize(16)
//       .text("Analytics Summary");

//     doc.moveDown(0.5);

//     doc
//       .fontSize(12)
//       .text(`Total Sales: ₦${totalSales}`);

//     doc.text(`Total Orders: ${totalOrders}`);

//     doc.text(
//       `Average Order Value: ₦${avgOrderValue}`
//     );

//     doc.moveDown();

//     // Recent Orders Section
//     doc
//       .fontSize(16)
//       .text("Recent Orders");

//     doc.moveDown(0.5);

//     if (orders.length === 0) {
//       doc
//         .fontSize(12)
//         .text("No orders found.");
//     } else {
//       orders.slice(0, 5).forEach((order, index) => {
//         doc
//           .fontSize(12)
//           .text(
//             `${index + 1}. Order ID: ${order._id}`
//           );

//         doc.text(
//           `Buyer: ${order.buyer?.username || "N/A"
//           }`
//         );

//         doc.text(
//           `Amount: ₦${order.pricing?.total || 0}`
//         );

//         doc.text(
//           `Date: ${new Date(
//             order.createdAt
//           ).toLocaleDateString()}`
//         );

//         doc.moveDown();
//       });
//     }

//     // Top Products Section
//     doc
//       .fontSize(16)
//       .text("Top Products");

//     doc.moveDown(0.5);

//     if (topProducts.length === 0) {
//       doc
//         .fontSize(12)
//         .text("No products found.");
//     } else {
//       topProducts.forEach((product, index) => {
//         doc
//           .fontSize(12)
//           .text(
//             `${index + 1}. ${product.name}`
//           );

//         doc.text(
//           `Price: ₦${product.price || 0}`
//         );

//         doc.text(
//           `Sold: ${product.sold || 0}`
//         );

//         doc.text(
//           `Stock: ${product.stock || 0}`
//         );

//         doc.moveDown();
//       });
//     }

//     doc.end();
//   } catch (error) {
//     console.log(
//       "Export Vendor Analytics PDF Error:",
//       error
//     );

//     res.status(500).json({
//       success: false,
//       message: "Failed to export analytics PDF",
//     });
//   }
// };

// exports.getVendorActivities = async (req, res) => {
//   try {
//     const logs = await AuditLog.find({ user: req.user._id })
//       .sort({ createdAt: -1 })
//       .limit(3);

//     if (!logs || logs.length === 0) {
//       return res.status(200).json({
//         success: true,
//         data: logs || []
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: logs
//     });

//   } catch (error) {
//     res.status(500).json({
//       message: 'Failed to fetch activities'
//     });
//   }
// };