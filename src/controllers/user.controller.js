import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";

const deleteLocalFile = (fileName) => {
  if (fs.existsSync(fileName)) {
    fs.unlink(fileName, (err) => {
      if (err) console.error("Error deleting local file:", err);
      else console.log("Local file deleted:", fileName);
    });
  }
};
const registerUser = AsyncHandler(async (req, res) => {
  // Step 1: Extract User Inputs
  const { username, email, fullName, password } = req.body;

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  try {
    // Step 2: Validate Inputs
    if ([username, email, fullName, password].some((field) => !field?.trim())) {
      throw new ApiError(400, "All fields are required");
    }

    // Step 3: Check if Username or Email Already Exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ApiError(409, "Username or Email already exists");
    }

    // Step 4: Handle Image Uploads

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar image is required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    if (!avatar?.url) {
      throw new ApiError(500, "Failed to upload avatar image");
    }

    let coverImage = null;
    if (coverLocalPath) {
      coverImage = await uploadToCloudinary(coverLocalPath);
    }

    // Step 5: Create New User in Database
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      password,
    });

    // Step 5: Fetch Created User Without Password and Refresh Token
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      await destroyImage(avatar.url);
      if (coverImage?.url) {
        await destroyImage(coverImage.url);
      }

      throw new ApiError(500, "Failed to create user");
    }

    // Step 6: Send Response
    res.status(201).json(new ApiResponse(201, createdUser));
  } catch (error) {
    if (coverLocalPath) deleteLocalFile(coverLocalPath);
    if (avatarLocalPath) deleteLocalFile(avatarLocalPath);
    throw new ApiError(500, error?.message);
  }
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating access and refresh token:", error);
    throw new ApiError(500, "Failed to generate access and refresh token");
  }
};
const loginUser = AsyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  console.log(req);
  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }
  if (!password) {
    throw new ApiError(400, "Password is required");
  }
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(401, "Invalid Credentials");
  }
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, "Invalid Credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loginUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        { user: loginUser, accessToken },
        "User Login Successfully"
      )
    );
});

const logoutUser = AsyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const option = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User Logout Successfully"));
});


const changeCurrentUserPassword = AsyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "User is not authenticated");
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current Password and New Password are required");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      "New password cannot be the same as the current password"
    );
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isMatched = await user.comparePassword(currentPassword);
  if (!isMatched) {
    throw new ApiError(401, "Invalid Current Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = AsyncHandler(async (req, res) => {
  req
    .status(200)
    .json(
      new ApiResponse(200, req.user, "Current User retrieved successfully")
    );
});

const updateAccountDetails = AsyncHandler(async (req, res) => {
  let { username, email } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "Username and Email are required");
  }

  let newUsername = username.toLowerCase().trim();
  let newEmail = email.toLowerCase().trim();

  // Check if the username is changing
  if (req.user.username !== newUsername) {
    const existingUser = await User.findOne({
      username: newUsername,
      _id: { $ne: req.user._id }, // Ensure it's not the same user
    });

    if (existingUser) {
      throw new ApiError(409, "Username already exists");
    }
  }

  // Check if the email is changing
  if (req.user.email !== newEmail) {
    const existingUser = await User.findOne({
      email: newEmail,
      _id: { $ne: req.user._id },
    });

    if (existingUser) {
      throw new ApiError(409, "Email already exists");
    }
  }

  // Update user details
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { username: newUsername, email: newEmail } },
    { new: true }
  ).select("-password -refreshToken");

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        "User account details updated successfully"
      )
    );
});


const updateAvatarImage = AsyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "User is not authenticated");
  }

  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  const avatar = await uploadToCloudinary(avatarLocalPath);
  if (!avatar?.url) {
    throw new ApiError(500, "Failed to upload avatar image to Cloudinary");
  }

  // Delete old avatar if exists
  if (req.user.avatar) {
    await destroyImage(req.user.avatar);
  }

  // Update user with new avatar URL
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar Updated Successfully"));
});


export { registerUser, loginUser, logoutUser, refreshAccessToken,changeCurrentUserPassword,getCurrentUser,updateAccountDetails,updateAvatarImage };
