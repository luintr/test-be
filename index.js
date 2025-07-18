const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const removeRoute = require("./routes/remove");

// Load environment variables
dotenv.config();

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Production optimizations
if (isProduction) {
  // Trust proxy for production (if behind reverse proxy)
  app.set('trust proxy', 1);
  
  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : '*';
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Request size limits (smaller in production for security)
const maxFileSize = isProduction ? '5mb' : '10mb';
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Health check endpoint
app.get("/health", (req, res) => {
  const healthData = {
    status: "OK",
    message: "Background removal API is running",
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  // In production, don't expose memory usage
  if (isProduction) {
    delete healthData.memory;
  }
  
  res.status(200).json(healthData);
});

// API routes
app.use("/api/remove", removeRoute);

// Error handling middleware
app.use((err, req, res, next) => {
  const errorMessage = isProduction ? 'Internal server error' : err.message;
  
  // Log errors appropriately
  if (isProduction) {
    console.error('Production Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } else {
    console.error("Development Error:", err);
  }
  
  res.status(500).json({ 
    error: "Internal server error",
    message: errorMessage
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    message: isProduction ? "The requested resource was not found" : `Route ${req.originalUrl} not found`
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🔧 API endpoint: http://localhost:${PORT}/api/remove`);
  
  if (isProduction) {
    console.log(`🛡️ Production mode enabled - Enhanced security and performance`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  } else {
    console.log(`🔍 Development mode - Detailed error messages enabled`);
  }
});
