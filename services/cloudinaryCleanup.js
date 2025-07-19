const cloudinary = require('cloudinary').v2;
const cron = require('node-cron');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function cleanupOldImages() {
  try {
    console.log('🔄 Starting cleanup of old images...');
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    console.log(`📅 Deleting images older than: ${threeMonthsAgo.toISOString()}`);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 1000,
      prefix: process.env.CLOUDINARY_FOLDER || '',
    });
    
    let deletedCount = 0;
    let skippedCount = 0;
    
    for (const resource of result.resources) {
      const createdAt = new Date(resource.created_at);
      
      if (createdAt < threeMonthsAgo) {
        try {
          await cloudinary.uploader.destroy(resource.public_id);
          console.log(`🗑️ Deleted: ${resource.public_id} (created: ${createdAt.toISOString()})`);
          deletedCount++;
        } catch (error) {
          console.error(`❌ Failed to delete ${resource.public_id}:`, error.message);
        }
      } else {
        skippedCount++;
      }
    }
    
    console.log(`✅ Cleanup completed. Deleted ${deletedCount} old images, kept ${skippedCount} recent images.`);
    
    return {
      deleted: deletedCount,
      kept: skippedCount,
      cutoffDate: threeMonthsAgo.toISOString()
    };
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

function initCleanupCron() {
  cron.schedule('0 2 1 * *', () => {
    console.log('📅 Monthly cleanup triggered');
    cleanupOldImages().catch(error => {
      console.error('❌ Monthly cleanup failed:', error.message);
    });
  }, {
    timezone: "Asia/Ho_Chi_Minh" //Adjust timezone
  });
  
  console.log('⏰ Cleanup cron job initialized - will run on 1st of each month at 2:00 AM');
}

async function runCleanupNow() {
  return await cleanupOldImages();
}

async function getCleanupInfo() {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 1000,
      prefix: process.env.CLOUDINARY_FOLDER || '',
    });
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const oldImages = result.resources.filter(resource => 
      new Date(resource.created_at) < threeMonthsAgo
    );
    
    const recentImages = result.resources.filter(resource => 
      new Date(resource.created_at) >= threeMonthsAgo
    );
    
    return {
      totalImages: result.resources.length,
      oldImages: oldImages.length,
      recentImages: recentImages.length,
      cutoffDate: threeMonthsAgo.toISOString(),
      nextCleanup: '1st of next month at 2:00 AM'
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  initCleanupCron,
  cleanupOldImages,
  runCleanupNow,
  getCleanupInfo
}; 