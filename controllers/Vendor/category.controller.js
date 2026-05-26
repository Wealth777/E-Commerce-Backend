const categoryService = require("../../services/vendor/category.service");

const getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllApprovedCategories();

    return res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

const createVendorCategory = async (req, res, next) => {
  try {
    const { name, description, parentCategory } = req.body;

    const category = await categoryService.createCategory({
      name,
      description,
      parentCategory: parentCategory || null,
      createdBy: req.vendor?._id || req.user?._id || null,
      createdByModel: "Vendor",
      status: "pending",
      isDefault: false,
    });

    return res.status(201).json({
      success: true,
      message: "Category submitted successfully and awaiting approval",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const approveCategory = async (req, res, next) => {
  try {
    const category = await categoryService.approveCategory(req.params.categoryId);

    return res.status(200).json({
      success: true,
      message: "Category approved successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

const rejectCategory = async (req, res, next) => {
  try {
    const category = await categoryService.rejectCategory(req.params.categoryId);

    return res.status(200).json({
      success: true,
      message: "Category rejected successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createVendorCategory,
  approveCategory,
  rejectCategory,
};