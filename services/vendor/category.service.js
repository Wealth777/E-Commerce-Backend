const Category = require("../../models/category.model");

const slugify = (value) => {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getAllApprovedCategories = async () => {
  const categories = await Category.find({
    status: "approved",
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  const parentCategories = categories.filter((cat) => !cat.parentCategory);

  return parentCategories.map((parent) => ({
    ...parent,
    subCategories: categories.filter(
      (cat) =>
        cat.parentCategory &&
        cat.parentCategory.toString() === parent._id.toString()
    ),
  }));
};

const createCategory = async ({
  name,
  description = "",
  parentCategory = null,
  createdBy = null,
  createdByModel = "Vendor",
  isDefault = false,
  status = "pending",
}) => {
  if (!name || !name.trim()) {
    throw new Error("Category name is required");
  }

  let level = 1;

  if (parentCategory) {
    const parent = await Category.findById(parentCategory);

    if (!parent) {
      throw new Error("Parent category not found");
    }

    if (parent.level !== 1) {
      throw new Error("Subcategory cannot have another subcategory as parent");
    }

    level = 2;
  }

  const existingCategory = await Category.findOne({
    name: name.trim(),
    parentCategory,
  }).collation({ locale: "en", strength: 2 });

  if (existingCategory) {
    throw new Error("Category already exists");
  }

  const baseSlug = slugify(name);
  let slug = parentCategory ? `${baseSlug}-${Date.now()}` : baseSlug;

  const slugExists = await Category.findOne({ slug });

  if (slugExists) {
    slug = `${baseSlug}-${Date.now()}`;
  }

  const category = await Category.create({
    name: name.trim(),
    slug,
    description,
    parentCategory,
    level,
    status,
    isDefault,
    isActive: true,
    createdBy,
    createdByModel,
  });

  return category;
};

const approveCategory = async (categoryId) => {
  const category = await Category.findByIdAndUpdate(
    categoryId,
    { status: "approved" },
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
};

const rejectCategory = async (categoryId) => {
  const category = await Category.findByIdAndUpdate(
    categoryId,
    { status: "rejected" },
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
};

module.exports = {
  getAllApprovedCategories,
  createCategory,
  approveCategory,
  rejectCategory,
};