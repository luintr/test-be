const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

async function removeBackground(filePath) {
  const startTime = Date.now();
  
  // Validate API key
  if (!process.env.REMOVE_BG_API_KEY) {
    throw new Error("REMOVE_BG_API_KEY environment variable is not set");
  }

  // Validate file exists
  if (!fs.existsSync(filePath)) {
    throw new Error("Image file not found");
  }

  // Validate file size (stricter in production)
  const stats = fs.statSync(filePath);
  const fileSizeInMB = stats.size / (1024 * 1024);
  const maxSizeMB = isProduction ? 5 : 10;
  
  if (fileSizeInMB > maxSizeMB) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
  }

  try {
    const fileName = path.basename(filePath);
    
    if (isProduction) {
      console.log(`Sending request to Remove.bg API for file: ${fileName} (${fileSizeInMB.toFixed(2)}MB)`);
    } else {
      console.log(`📤 Sending request to Remove.bg API for file: ${fileName} (${fileSizeInMB.toFixed(2)}MB)`);
    }

    const formData = new FormData();
    formData.append("image_file", fs.createReadStream(filePath));
    formData.append("size", "auto");

    const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
      headers: {
        ...formData.getHeaders(),
        "X-Api-Key": process.env.REMOVE_BG_API_KEY,
      },
      responseType: "arraybuffer",
      timeout: isProduction ? 45000 : 30000, // Longer timeout in production
    });

    // Clean up the uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const processingTime = Date.now() - startTime;
    
    if (isProduction) {
      console.log(`Successfully processed image in ${processingTime}ms: ${fileName}`);
    } else {
      console.log(`✅ Successfully processed image in ${processingTime}ms: ${fileName}`);
    }

    return response.data;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    // Clean up the uploaded file on error
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Handle axios errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      if (isProduction) {
        console.error(`Remove.bg API error (${status}) for file: ${path.basename(filePath)}`);
      } else {
        console.error(`❌ Remove.bg API error (${status}):`, data.toString());
      }
      
      switch (status) {
        case 400:
          throw new Error("Invalid image format or corrupted file");
        case 401:
          throw new Error("Invalid API key");
        case 402:
          throw new Error("API quota exceeded");
        case 429:
          throw new Error("Rate limit exceeded");
        default:
          throw new Error(`Remove.bg API error: ${status}`);
      }
    }

    // Handle network errors
    if (error.code === "ECONNABORTED") {
      throw new Error("Request timeout - please try again");
    }

    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
      throw new Error("Network error - please check your connection");
    }

    // Handle file system errors
    if (error.code === "ENOENT") {
      throw new Error("Image file not found");
    }

    // Generic error
    if (isProduction) {
      console.error(`Unexpected error in removeBackground (${processingTime}ms):`, {
        error: error.message,
        file: path.basename(filePath),
        stack: error.stack
      });
    } else {
      console.error(`❌ Unexpected error in removeBackground (${processingTime}ms):`, error.message);
    }
    
    throw new Error("Failed to process image");
  }
}

module.exports = { removeBackground };
