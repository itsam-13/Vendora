const ImageKit = require("imagekit");
const { v4: uuidv4 } = require('uuid')

let imagekitInstance = null;

function getImageKitInstance() {
    if (!imagekitInstance) {
        imagekitInstance = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
        });
    }
    return imagekitInstance;
}

async function uploadToImageKit(file, folder = "/products") {
    const ik = getImageKitInstance();
    const response = await ik.upload({
        file: file.buffer,
        fileName: uuidv4(),
        folder: folder
    });

    return {
        url: response.url,
        thumbnail: response.thumbnailUrl || response.url,
        id: response.fileId
    };
}

module.exports = {
    getImageKitInstance,
    uploadToImageKit
};
