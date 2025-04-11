import express from "express";
import {
  fetchLeaderboard,
  getProfile,
  login,
  logout,
  register,
  forgotPassword,
  verifyOTPAndResetPassword,
  hello,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// 🟢 Auth & User Routes
router.post("/register", register);
router.post("/login", login);
router.get("/me", isAuthenticated, getProfile);
router.get("/logout", isAuthenticated, logout);

// 🟢 Leaderboard
router.get("/leaderboard", fetchLeaderboard);

// 🟢 Test Route
router.get("/hh", hello);

// 🟢 OTP-based Password Reset Routes
router.post("/forgot-password", forgotPassword);  // sends OTP to email
router.post("/reset-password", verifyOTPAndResetPassword);    // user submits email, OTP, newPassword

export default router;
