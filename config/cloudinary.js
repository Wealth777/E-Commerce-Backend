const cloudinary = require('cloudinary').v2;

cloudinary.config({
  // cloud_name: process.env.cloud_Name,
  cloud_name: "dnao9hmx9",
  // api_key: process.env.cloud_API_Key,
  api_key: '735511316565175',
  // api_secret: process.env.cloud_API_Secret
  api_secret: 'lcW83Dz-nqORbf5BTle6lkwFfZU'
});

module.exports = cloudinary;