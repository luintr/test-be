const express = require('express');
const multer = require('multer');
const cloudinary = require('../services/cloudinary');
const { runCleanupNow, getCleanupInfo } = require('../services/cloudinaryCleanup');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.array('image', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadedUrls = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path);
      uploadedUrls.push(result.secure_url);
      
      fs.unlinkSync(file.path);
    }

    res.json({ 
      message: `Uploaded ${uploadedUrls.length} images successfully`,
      urls: uploadedUrls 
    });

  } catch (error) {
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// API để chạy cleanup thủ công
router.post('/cleanup', async (req, res) => {
  try {
    const result = await runCleanupNow();
    res.json({ 
      message: 'Cleanup completed successfully',
      result: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API để xem thông tin cleanup
router.get('/cleanup-info', async (req, res) => {
  try {
    const info = await getCleanupInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
