import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp");
  },
  filename: (req, file, cb) => {
    let extensionOfFile=path.extname(file.originalname);
    let newFileName=file.originalname + "-" + uuid()+extensionOfFile;
    cb(null, newFileName);
  },
});

export const upload = multer({ storage });
