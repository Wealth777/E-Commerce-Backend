const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("../config/cloudinary")

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "gmc/product/image",
    allowed_formats: ["jpg", "jpeg", "png"]
  }
})

const imageUpload = multer({ storage })

module.exports = imageUpload