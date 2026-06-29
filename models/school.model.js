const mongoose = require("mongoose");

const schoolSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },

    level: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["school", "state", "location"],
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByModel",
      default: null,
    },

    createdByModel: {
      type: String,
      enum: ["Admin"],
      default: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

schoolSchema.index(
  {
    name: 1,
    parent: 1,
    level: 1,
  },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  }
);

module.exports = mongoose.model("School", schoolSchema);