const mongoose = require('mongoose');
const Counter = require("../models/serialCounter.model.js");

const generateSerialNumber = async (role, session) => {
  const year = new Date().getFullYear();

  try {
    const counter = await Counter.findOneAndUpdate(
      { role, year },
      { $inc: { sequence: 1 } },
      {
        returnDocument: 'after',
        // new: true,
        upsert: true,
        session
      }
    );

    const paddedNumber = String(counter.sequence).padStart(4, "0");
    return `${role}/${year}/${paddedNumber}`;
  } catch (error) {
    throw new Error(`Failed to generate serial number: ${error.message}`);
  }
};

module.exports = { generateSerialNumber };