const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'jue23qpn',
  api_key: '891595639549973',
  api_secret: 'vyoMkturP3gv0WeWwJX3p_EzUVY',
});

// A small valid MP4 file header or random buffer
const buffer = Buffer.alloc(100);

console.log("Starting upload...");
cloudinary.uploader.upload_stream(
  {
    folder: 'thelifeholics',
    resource_type: 'video',
  },
  (error, result) => {
    if (error) {
      console.error("Upload error:", error);
    } else {
      console.log("Upload result:", result);
    }
  }
).end(buffer);
