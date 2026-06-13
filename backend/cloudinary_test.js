#!/usr/bin/env npx ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: 'dletrtogt',
    api_key: '332573535758619',
    api_secret: 'NIq4rqo-RcgvVdAndbxfwB5T12s'
});
async function run() {
    try {
        console.log('Uploading sample image...');
        const uploadResult = await cloudinary_1.v2.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', { public_id: 'cloudinary_onboarding_sample' });
        console.log('Secure URL:', uploadResult.secure_url);
        console.log('Public ID:', uploadResult.public_id);
        console.log('Fetching image metadata...');
        const details = await cloudinary_1.v2.api.resource(uploadResult.public_id);
        console.log('Width:', details.width);
        console.log('Height:', details.height);
        console.log('Format:', details.format);
        console.log('File Size (bytes):', details.bytes);
        const transformedUrl = cloudinary_1.v2.url(uploadResult.public_id, {
            fetch_format: 'auto',
            quality: 'auto',
            secure: true
        });
        console.log('Done! Click link below to see optimized version of the image. Check the size and the format.');
        console.log(transformedUrl);
    }
    catch (error) {
        console.error('Error during Cloudinary operations:', error);
    }
}
run();
//# sourceMappingURL=cloudinary_test.js.map