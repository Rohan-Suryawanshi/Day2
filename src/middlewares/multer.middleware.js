import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

const uploadDir = "./public/temp";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!file) {
      return cb(new Error("File is missing"), ""); // Properly handle missing files
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    if (!file) {
      return cb(new Error("File is missing"), ""); // Ensure cb gets correct arguments
    }

    const extensionOfFile = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extensionOfFile);
    const newFileName = `${baseName}-${uuid()}${extensionOfFile}`;

    cb(null, newFileName);
  },
});

// Define multer upload middleware
export const upload = multer({
  storage
});
