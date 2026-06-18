import { v2 as cloudinary } from 'cloudinary';

let isConfigured = false;
const ensureConfigured = () => {
  if (!isConfigured) {
    if (process.env.CLOUDINARY_URL) {
      isConfigured = true;
      return;
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    isConfigured = true;
  }
};

/**
 * Uploads a file buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer - File buffer
 * @param {string} folder - Destination folder in Cloudinary
 * @param {string} originalFileName - Original name of the uploaded file
 * @returns {Promise<Object>} Cloudinary upload response object
 */
export const uploadBufferToCloudinary = (buffer, folder, originalFileName) => {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const options = {
      folder,
      resource_type: 'auto', // Will support PDFs, images, raw files, etc.
    };
    
    if (originalFileName) {
      // Clean up filename and append timestamp to prevent conflicts
      const baseName = originalFileName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_');
      options.public_id = `${baseName}_${Date.now()}`;
    }

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    
    stream.end(buffer);
  });
};

/**
 * Deletes a resource from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type ('image' or 'raw')
 * @returns {Promise<Object>} Cloudinary deletion response
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

/**
 * Generates a signed secure URL for downloading files, forcing download attachment behavior
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type ('image' or 'raw')
 * @param {string} [originalFileName=null] - Optional original filename
 * @returns {string} The signed secure download URL
 */
export const generateSignedUrl = (publicId, resourceType = 'image', originalFileName = null) => {
  ensureConfigured();
  const options = {
    resource_type: resourceType,
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
  };

  if (originalFileName) {
    // Extract base filename without extension to avoid dots in Cloudinary's transformation flag (which triggers HTTP 400 errors)
    const parts = originalFileName.split('.');
    const baseName = parts.length > 1 ? parts.slice(0, -1).join('.') : originalFileName;
    const sanitizedBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'file';
    options.flags = `attachment:${sanitizedBase}`;

    // Explicitly set format for images/PDFs if extension matches known types
    if (resourceType === 'image') {
      const ext = parts.pop().toLowerCase();
      if (['pdf', 'png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
        options.format = ext;
      }
    }
  } else {
    options.flags = 'attachment';
  }

  return cloudinary.url(publicId, options);
};
