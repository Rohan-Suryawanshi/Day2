import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) throw new Error("Local file path is required");
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("File is Uploaded Successfully :" + response.url);

    fs.unlink(localFilePath); //Remove the locally saved temporary file

    return response;
  } catch (error) {
    fs.unlink(localFilePath); //Remove the locally saved temporary file
    return { success: false, message: error.message };
  }
};
export { uploadToCloudinary };
