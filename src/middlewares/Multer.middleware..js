import multer from "multer";
import { v4 as uuid } from "uuid";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./public/temp");
  },
  filename: (req, file, cb) => {
    let newFileName=file.originalname + "-" + uuid();
    cb(null, newFileName);
  },
});

export const upload = multer({ storage });
