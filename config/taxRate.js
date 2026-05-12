const getTaxRate = async (productIds, vendorId) => {
  // Option 1: Config file
  const TAX_RATES = {
    default: 0.05,  // 5%
    regions: {
      'Nigeria': 0.075,  // 7.5% for Nigeria
      'Ghana': 0.055,    // 5.5% for Ghana
    }
  };
  
  // Option 2: Database
  // const taxConfig = await TaxConfig.findOne({ region: buyer.country });
  
  return TAX_RATES.default;
};

module.exports = { getTaxRate }