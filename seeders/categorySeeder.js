const mongoose = require("mongoose");
require("dotenv").config();

const Category = require("../models/category.model");

const categories = [
  {
    name: "Home & Office",
    subCategories: [
      "Furniture",
      "Home Decor",
      "Kitchen & Dining",
      "Bedding",
      "Bath",
      "Storage & Organization",
      "Office Furniture",
      "Office Supplies",
      "Home Appliances",
      "Cleaning Supplies",
      "Lighting",
    ],
  },
  {
    name: "Phones & Tablets",
    subCategories: [
      "Smartphones",
      "Feature Phones",
      "Tablets",
      "Smartwatches",
      "Phone Cases",
      "Chargers",
      "Power Banks",
      "Earphones & Headphones",
      "Memory Cards",
      "Phone Accessories",
    ],
  },
  {
    name: "Health & Beauty",
    subCategories: [
      "Makeup",
      "Skincare",
      "Hair Care",
      "Fragrances",
      "Personal Care",
      "Oral Care",
      "Vitamins & Supplements",
      "Beauty Tools",
      "Hair Extensions & Wigs",
      "Men's Grooming",
    ],
  },
  {
    name: "Electronics",
    subCategories: [
      "Televisions",
      "Home Theatres",
      "Soundbars",
      "Speakers",
      "Cameras",
      "Audio Systems",
      "DVD Players",
      "TV Accessories",
      "Stabilizers",
      "Video Equipment",
    ],
  },
  {
    name: "Fashion",
    subCategories: [
      "Men's Clothing",
      "Women's Clothing",
      "Kids Fashion",
      "Shoes",
      "Bags",
      "Watches",
      "Jewelry",
      "Sunglasses",
      "Luggage & Travel Accessories",
      "Fashion Accessories",
    ],
  },
  {
    name: "Computing",
    subCategories: [
      "Laptops",
      "Desktops",
      "Printers",
      "Monitors",
      "Storage Devices",
      "Networking Devices",
      "Computer Accessories",
      "Software",
      "Keyboards",
      "Mice",
    ],
  },
  {
    name: "Supermarket",
    subCategories: [
      "Food Cupboard",
      "Beverages",
      "Cooking Ingredients",
      "Baby Food",
      "Household Cleaning",
      "Laundry Supplies",
      "Snacks",
      "Breakfast Foods",
      "Canned Foods",
      "Personal Care Products",
    ],
  },
  {
    name: "Baby Products",
    subCategories: [
      "Diapers",
      "Feeding Products",
      "Baby Clothing",
      "Baby Toys",
      "Baby Health Care",
      "Strollers",
      "Car Seats",
      "Nursery Furniture",
    ],
  },
  {
    name: "Appliances",
    subCategories: [
      "Refrigerators",
      "Freezers",
      "Air Conditioners",
      "Washing Machines",
      "Blenders",
      "Microwaves",
      "Electric Kettles",
      "Fans",
      "Cookers",
      "Vacuum Cleaners",
    ],
  },
  {
    name: "Gaming",
    subCategories: [
      "Gaming Consoles",
      "Gaming Accessories",
      "Gaming Controllers",
      "Video Games",
      "Gaming Headsets",
      "Gaming Chairs",
    ],
  },
  {
    name: "Sporting Goods",
    subCategories: [
      "Fitness Equipment",
      "Outdoor Sports",
      "Football Equipment",
      "Basketball Equipment",
      "Cycling",
      "Gym Accessories",
    ],
  },
  {
    name: "Automobile",
    subCategories: [
      "Car Electronics",
      "Car Care Products",
      "Motorbike Accessories",
      "Car Accessories",
      "Tires & Wheels",
    ],
  },
  {
    name: "Power",
    subCategories: [
      "Generators",
      "Solar Panels",
      "Inverters",
      "Batteries",
      "Electrical Accessories",
    ],
  },
];

const slugify = (value) => {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);

    console.log("MongoDB connected");

    for (const categoryData of categories) {
      const parentSlug = slugify(categoryData.name);

      let parentCategory = await Category.findOne({ slug: parentSlug });

      if (!parentCategory) {
        parentCategory = await Category.create({
          name: categoryData.name,
          slug: parentSlug,
          parentCategory: null,
          level: 1,
          status: "approved",
          isDefault: true,
          isActive: true,
          createdBy: null,
          createdByModel: "Admin",
        });
      }

      for (const subCategoryName of categoryData.subCategories) {
        const subCategorySlug = `${parentSlug}-${slugify(subCategoryName)}`;

        const existingSubCategory = await Category.findOne({
          slug: subCategorySlug,
        });

        if (!existingSubCategory) {
          await Category.create({
            name: subCategoryName,
            slug: subCategorySlug,
            parentCategory: parentCategory._id,
            level: 2,
            status: "approved",
            isDefault: true,
            isActive: true,
            createdBy: null,
            createdByModel: "Admin",
          });
        }
      }
    }

    console.log("Categories seeded successfully");

    process.exit(0);
  } catch (error) {
    console.error("Category seeding failed:", error);
    process.exit(1);
  }
};

seedCategories();