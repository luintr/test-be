const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { removeBackground } = require("../services/removeBgService");

const router = express.Router();
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are allowed."), false);
  }
};

// File size limit based on environment
const maxFileSize = isProduction ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB in production, 10MB in dev

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxFileSize,
  },
});

// POST /api/remove - Remove background from image
router.post("/", upload.single("image"), async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: "No image file provided",
        message: "Please upload an image file using the 'image' field"
      });
    }

    // Log request details (more detailed in development)
    if (isProduction) {
      console.log(`Processing image: ${req.file.originalname} (${req.file.size} bytes) from ${req.ip}`);
    } else {
      console.log(`Processing image: ${req.file.originalname} (${req.file.size} bytes)`);
      console.log(`File path: ${req.file.path}`);
      console.log(`MIME type: ${req.file.mimetype}`);
    }

    // Remove background
    const result = await removeBackground(req.file.path);

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Set response headers
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "attachment; filename=removed-bg.png");
    res.setHeader("Cache-Control", "no-cache");
    
    if (isProduction) {
      res.setHeader("X-Processing-Time", `${processingTime}ms`);
    }

    // Log success
    if (isProduction) {
      console.log(`Successfully processed image in ${processingTime}ms: ${req.file.originalname}`);
    } else {
      console.log(`✅ Successfully processed image in ${processingTime}ms: ${req.file.originalname}`);
    }

    // Send the processed image
    res.send(result);

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Handle specific error types
    if (error.response?.status === 402) {
      return res.status(402).json({
        error: "API quota exceeded",
        message: "Remove.bg API quota has been exceeded. Please try again later."
      });
    }

    if (error.response?.status === 401) {
      return res.status(401).json({
        error: "Invalid API key",
        message: "Remove.bg API key is invalid or missing."
      });
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      const maxSizeMB = isProduction ? 5 : 10;
      return res.status(400).json({
        error: "File too large",
        message: `Image file size must be less than ${maxSizeMB}MB.`
      });
    }

    // Log error appropriately
    if (isProduction) {
      console.error(`Error processing image in ${processingTime}ms:`, {
        error: error.message,
        file: req.file?.originalname,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    } else {
      console.error(`❌ Error processing image in ${processingTime}ms:`, error.message);
    }

    res.status(500).json({
      error: "Failed to remove background",
      message: isProduction ? "An error occurred while processing the image" : error.message
    });
  }
});

// GET /api/remove - API information
router.get("/", (req, res) => {
  const apiInfo = {
    message: "Background Removal API",
    endpoint: "/api/remove",
    method: "POST",
    description: "Remove background from uploaded image",
    parameters: {
      image: `Image file (JPEG, PNG, WebP) - max ${isProduction ? '5MB' : '10MB'}`
    },
    response: "PNG image with transparent background",
    environment: NODE_ENV
  };
  
  // Add more details in development
  if (!isProduction) {
    apiInfo.examples = {
      curl: `curl -X POST -F "image=@/path/to/your/image.jpg" http://localhost:3000/api/remove --output removed-bg.png`,
      javascript: `const formData = new FormData(); formData.append('image', fileInput.files[0]); fetch('/api/remove', { method: 'POST', body: formData })`
    };
  }
  
  res.json(apiInfo);
});

module.exports = router;
