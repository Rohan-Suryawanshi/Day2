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

    // fs.unlinkSync(localFilePath); //Remove the locally saved temporary file
    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.error("Error deleting local file:", err);
      } else {
        console.log("Local file deleted:", localFilePath);
      }
    });
    return response;
  } catch (error) {
    // fs.unlinkSync(localFilePath); //Remove the locally saved temporary file
    fs.unlink(localFilePath, (err) => {
      if (err) console.error("Error deleting local file:", err);
    });
    return { success: false, message: error.message };
  }
};
const destroyImage = async (imageUrl) => {
  try {
    if (!imageUrl) throw new Error("Image URL is required");

    // Extract public ID from Cloudinary URL

    const publicId = imageUrl.split("/").pop().split(".")[0];
    console.log("Deleting Cloudinary Image:", publicId);

    let result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error.message);
    return { success: false, message: error.message };
  }
};

export { uploadToCloudinary, destroyImage };
