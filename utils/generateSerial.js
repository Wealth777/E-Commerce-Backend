const Counter = require("../models/serialCounter.model.js");

const generateSerialNumber = async (role) => {
  const year = new Date().getFullYear();

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const counter = await Counter.findOneAndUpdate(
      { role, year },
      { $inc: { sequence: 1 } },
      {
        returnDocument: 'after',
        upsert: true,
        session
      }
    );

    await session.commitTransaction();
    session.endSession();

    const paddedNumber = String(counter.sequence).padStart(4, "0");
    return `${role}/${year}/${paddedNumber}`;
  } catch (error) {
    throw new Error(`Failed to generate serial number: ${error.message}`);
  }
};

module.exports = { generateSerialNumber };