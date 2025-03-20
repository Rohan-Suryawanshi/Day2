import { Router } from "express";
import { changeCurrentUserPassword, getCurrentUser, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateAvatarImage, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

// router.route("/register").get(registerUser);
router.post(
  "/register",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.post("/login",loginUser)
router.post("/refresh-token",refreshAccessToken);

// 🔹 Authenticated Routes
router.post("/logout", verifyJWT, logoutUser);
router.get("/current-user", verifyJWT, getCurrentUser);
router.put("/account-details", verifyJWT, updateAccountDetails);
router.put("/change-password", verifyJWT, changeCurrentUserPassword);
router.put("/avatar", verifyJWT, upload.single("avatar"), updateAvatarImage);
router.put("/cover-image", verifyJWT, upload.single("coverImage"),updateCoverImage);

export default router;
