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

const refreshAccessToken = AsyncHandler(async (req, res) => {
  const token =
    req.cookies?.accessToken || req.header("Authorization").split(" ")[1];
  if (!token) {
    throw new ApiError(401, "Access Token Is required");
  }
  try {
    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select("-password");
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    if (refreshAccessToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired");
    }
    const option = {
      httpOnly: true,
      secure: true,
    };
    const { newAccessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    req
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", refreshToken, option)
      .json(
        new ApiResponse(
          200,
          { accessToken: newAccessToken, refreshToken: newRefreshToken },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token");
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
