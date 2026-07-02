const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");
const crypto = require('crypto');

const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const ext = file.originalname.split('.').pop();
    const sanitizedName = crypto.randomBytes(16).toString('hex');

    return {
      folder: "gmc/product/image",
      public_id: sanitizedName,
      format: ext,
    };
  }
});

const paymentProofStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new Error('Invalid file type');
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop().toLowerCase();

    return {
      folder: "gmc/payment/proof",
      resource_type: "auto",
      format: ext === 'pdf' ? 'pdf' : undefined,
      public_id: `proof_${uniqueSuffix}`,
      type: 'authenticated'
    };
  }
});

const vendorOnboardingStorage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "campustrade/vendor-onboarding",
        public_id: crypto.randomBytes(16).toString("hex"),
        resource_type: "image",
    }),
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
    fileSize: 5 * 1024 * 1024 // 5MB limit for proofs
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, PDF allowed"), false);
    }

    if (!/\.(jpg|jpeg|png|pdf)$/i.test(file.originalname)) {
      return cb(new Error("File extension doesn't match mime type"), false);
    }

    cb(null, true);
  }
});

const vendorOnboardingUpload = multer({
    storage: vendorOnboardingStorage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter(req, file, cb) {
        const allowed = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/jpg",
        ];

        if (!allowed.includes(file.mimetype)) {
            return cb(new Error("Invalid image"));
        }

        cb(null, true);
    },
});

module.exports = imageUpload;
module.exports.paymentProofUpload = paymentProofUpload;
module.exports.vendorOnboardingUpload = vendorOnboardingUpload;