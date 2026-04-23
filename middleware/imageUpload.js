const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "gmc/product/image",
    resource_type: "image",
    format: "png",
    public_id: Date.now() + "-" + file.originalname
  })
});

const paymentProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: "gmc/payment/proof",
    resource_type: "auto",
    public_id: Date.now() + "-" + file.originalname
  })
});


const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG allowed"), false);
    }

    cb(null, true);
  }
});

const paymentProofUpload = multer({
  storage: paymentProofStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for proofs
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, PDF allowed"), false);
    }

    cb(null, true);
  }
});

module.exports = imageUpload;
module.exports.paymentProofUpload = paymentProofUpload;