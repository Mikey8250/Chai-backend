import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateAccessToken();

    user.refreshToken = refreshToken;
    user.save({ validationBeforeSave: false });

    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(
      "500",
      "Something went wrong while generatint access token and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation not empty
  // check if user already exists: username, email
  // check for images, check for avaatar
  // upload it to cloudinary, avatar
  // create user object- create entry in db
  // remove password and refresh token field from avatar(because we can't send pass and refresh token in response)
  // check for user creation
  // return response

  const { fullName, email, username, password } = req.body;
  // console.log("email: ", email);

  if ([username, email, fullName, password].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are compulsory or required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exist");
  }

  // console.log(req.files);
  const avatarLocalPAth = req.files?.avatar[0]?.path;
  // console.log(req.files?.avatar[0]?.path);
  const coverImageLocalPAth = req.files?.coverImage?.[0]?.path;

  if (!avatarLocalPAth) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPAth);
  const coverImage = await uploadOnCloudinary(coverImageLocalPAth);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName: fullName,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went Wrong while registering a user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered Sucessfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // fetch user data --> req.body
  // username or email
  // find the user
  // password check
  // access and refresh token
  // send cookie

  const { email, username, password } = req.body;
  if (!(email || username)) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(404, "Invalid user credential");
  }

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshtoken"); 

  const options = {
    httpOnly: true,
    secure: true
  }  

  return res.status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200, 
      {
        user : loggedInUser, accessToken, refreshToken 
      },
      "User logged in successfully"
    )
  )

});

const logOutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set : {
        refreshToken: undefined
      },
      new : true
    }
  )
  const options = {
    httpOnly: true,
    secure: true
  }  

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    console.log(decodedToken);
    
    const user = await User.findById(decodedToken?._id)
  
    if (!user) {
      throw new ApiError("Invalid refresh token ")
    }
  
    if(incomingRefreshToken != user?.refreshToken){
      throw new ApiError("Refresh token is expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true
    }
    const {accessToken, newrefreshToken} = await generateAccessTokenAndRefreshToken(user._id) 
  
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken",refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {accessToken, rereshToken : newrefreshToken},
        "Access token refreshed successfully"
      ))
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  
  const {oldPassword, newPassword, confirmPassword} = req.body;

  if (!(newPassword == confirmPassword)) {
    throw new ApiError(400, "confirm password and new password mismatch")
  }
  
  const user = User.findById(req.user?._id)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password")
  }

  user.password = newPassword;
  await user.save({validationBeforeSave: false})

  return res
  .status(200)
  .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req, res) => {
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
  
  const {fullName, email} = req.body;
  
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set : {
        fullName: fullName,
        email: email
      }
    }
  ).select("-password")

  return res
  .status(200)
  .json(new ApiResponse(200, user, "Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req, res) => {
  const avatarLocalPAth = req.file?.path;
  console.log(avatarLocalPAth);
  
  if (!avatarLocalPAth) {
    throw new ApiError(400, "Avatar file is missing")
  }

  const avatar = uploadOnCloudinary(avatarLocalPAth);
  
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, 
    {
      $set: {
        avatar: avatar.url
      }
    }
  ).select("-password")

  
  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "Avatar image updated successfully"))

})

const updateUserCoverImage = asyncHandler(async(req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image is missing")
  }

  const coverImage = uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImageLocalPath.url
      }
    }
  ).select("-password");

  return res
  .status(200)
  .json(new ApiResponse(200, req.user, "Cover image updated successfully"))

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
  const {userName} = req.params;
  if (!userName.trim()) {
    throw new ApiError(400, "Username is missing")
  }

  const channel = User.aggregate([
    {
      $match: {
        username: userName?.toLowerCase()
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers"
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
            then: true,
            else: false
          }
        } 
      }
    },
    {
      $fullName: 1,
      $userName: 1,
      $subscribersCount: 1,
      $channelsSubscribedToCount: 1,
      $isSubscribed: 1,
      $coverImage: 1,
      $avatar: 1,
    }
  ])

  console.log(channel);
  
  if (!channel?.length) {
    throw new ApiError(404, "Channel does nOT eXIst")
  }

  return res
  .status(200)
  .json(new ApiResponse(200, channel[0], "user channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async(req, res) => {
  
  const user = await User.aggregate([
    {
      $match: {
        _id: mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1
                  }
                }
              ]
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner"
              }
            }
          }

        ]
      }
    }
  ])

  return res
  .status(200)
  .json(new ApiResponse(
    200,
    user[0].watchHistory,
    "watchHistory fetched successfully"
  ))

})



export { 
  registerUser, 
  loginUser, 
  logOutUser, 
  refreshAccessToken, 
  changeCurrentPassword, 
  getCurrentUser, 
  updateAccountDetails, 
  updateUserAvatar, 
  updateUserCoverImage,
  getWatchHistory 
};
