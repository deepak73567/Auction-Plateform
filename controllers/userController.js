import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { User } from "../models/userSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { generateToken } from "../utils/jwtToken.js";
import {sendEmail} from "../utils/sendEmail.js";

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = catchAsyncErrors(async (req, res, next) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorHandler("Profile Image Required", 400));
    }

    const { profileImage } = req.files;
    const allowedFormats = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedFormats.includes(profileImage.mimetype)) {
        return next(new ErrorHandler("File Format Not Supported", 400));
    }

    const {
        userName, email, password, phone, address, role,
        bankAccountNumber, bankAccountName, bankName,
        GooglePayAccountNumber, paypalEmail
    } = req.body;

    if (!userName || !email || !password || !phone || !address || !role) {
        return next(new ErrorHandler("Please fill the complete form", 400));
    }

    if (role === "Auctioneer") {
        if (!bankAccountName || !bankAccountNumber || !bankName) {
            return next(new ErrorHandler("Please provide your full bank details.", 400));
        }
        if (!GooglePayAccountNumber) {
            return next(new ErrorHandler("Please provide your GooglePayAccountNumber account number.", 400));
        }
        if (!paypalEmail) {
            return next(new ErrorHandler("Please provide your paypal email.", 400));
        }
    }

    const isRegistered = await User.findOne({ email });
    if (isRegistered) {
        return next(new ErrorHandler("User Already Registered", 400));
    }

    const cloudinaryResponse = await cloudinary.uploader.upload(profileImage.tempFilePath, {
        folder: "Auction_platform_user",
    });

    if (!cloudinaryResponse || cloudinaryResponse.error) {
        console.error("Cloudinary error:", cloudinaryResponse.error || "Unknown Cloudinary error");
        return next(new ErrorHandler("Failed to upload image to Cloudinary", 500));
    }

    const user = await User.create({
        userName,
        email,
        password,
        phone,
        address,
        role,
        profileImage: {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url,
        },
        PaymentMethods: {
            bankTransfer: {
                bankAccountNumber,
                bankAccountName,
                bankName,
            },
            GooglePay: {
                GooglePayAccountNumber,
            },
            paypal: {
                paypalEmail,
            },
        },
    });

    generateToken(user, "User Registered", 201, res);
});

export const login = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new ErrorHandler("Please fill full form"));
    }
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return next(new ErrorHandler("Invalid Credentials"));
    }
    const isPasswordMathched = await user.comparePassword(password);
    if (!isPasswordMathched) {
        return next(new ErrorHandler("Invalid Credentials", 400));
    }
    generateToken(user, "Login Successfully.", 200, res);
});

export const getProfile = catchAsyncErrors(async (req, res, next) => {
    const user = req.user;
    res.status(200).json({
        success: true,
        user,
    });
});

export const logout = catchAsyncErrors(async (req, res, next) => {
    res.status(200).cookie("token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logout Successfully. "
    });
});

export const fetchLeaderboard = catchAsyncErrors(async (req, res, next) => {
    const users = await User.find({ moneySpent: { $gt: 0 } });
    const leaderboard = users.sort((a, b) => b.moneySpent - a.moneySpent);

    res.status(200).json({
        success: true,
        leaderboard,
    });
});

export const hello = catchAsyncErrors(async (req, res, next) => {
    res.send("hello");
});

// ========== OTP BASED PASSWORD RESET ========== //

export const forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const email = req.body.email?.trim().toLowerCase(); // sanitize email
    const user = await User.findOne({ email });

    if (!user) return next(new ErrorHandler("User not found", 404));

    const otp = generateOTP();
    user.resetOTP = otp;
    user.resetOTPExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    await sendEmail({
        email: user.email,
        subject: "Your OTP for Password Reset",
        message: `Your OTP is ${otp}. It will expire in 15 minutes.`,
    });

    res.status(200).json({
        success: true,
        message: "OTP sent to your email."
    });
});



export const verifyOTPAndResetPassword = catchAsyncErrors(async (req, res, next) => {
    const email = req.body.email?.trim().toLowerCase();
    const { otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return next(new ErrorHandler("Please provide all required fields", 400));
    }

    const user = await User.findOne({ email });

    if (!user || user.resetOTP !== otp || user.resetOTPExpiry < Date.now()) {
        return next(new ErrorHandler("Invalid or expired OTP", 400));
    }
    await sendEmail({
        email: user.email,
        subject: "Password Reset Successful - Auction Platform",
        message: `Dear Auction Platform user,\n\nYour password has been reset successfully.\n\nIf this wasn't you, please contact support immediately.`,
      });
    user.password = newPassword;
    user.resetOTP = undefined;
    user.resetOTPExpiry = undefined;
    

    await user.save();
   

    res.status(200).json({
        success: true,
        message: "Password reset successful",
    });
});
