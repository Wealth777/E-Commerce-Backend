const Counter = require("../models/serialCounter.model.js");

const generateSerialNumber = async (role) => {
  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { role, year },
    { $inc: { sequence: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  const paddedNumber = String(counter.sequence).padStart(4, "0");

  return `${role}/${year}/${paddedNumber}`;
};

module.exports = { generateSerialNumber };