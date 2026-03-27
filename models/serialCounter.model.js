const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  sequence: {
    type: Number,
    default: 0,
  },
});

counterSchema.index({ role: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("Counter", counterSchema);