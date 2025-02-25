import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import ErrorHandler from "../middlewares/error.js";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

export const addNewAuctionItem = catchAsyncErrors(async (req, res, next) => {
  if (!req.files || !req.files.image) {
    return next(new ErrorHandler("Auction item image required.", 400));
  }

  const { image } = req.files;
  const allowedFormats = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedFormats.includes(image.mimetype)) {
    return next(new ErrorHandler("File format not supported.", 400));
  }

  const { title, description, category, condition, startingBid, startTime, endTime } = req.body;

  if (!title || !description || !category || !condition || !startingBid || !startTime || !endTime) {
    return next(new ErrorHandler("Please provide all details.", 400));
  }

  const startTimeDate = new Date(startTime);
  const endTimeDate = new Date(endTime);

  if (startTimeDate < Date.now()) {
    return next(new ErrorHandler("Auction start time must be in the future.", 400));
  }
  if (startTimeDate >= endTimeDate) {
    return next(new ErrorHandler("Start time must be before end time.", 400));
  }

  const activeAuction = await Auction.findOne({ createdBy: req.user._id, endTime: { $gt: Date.now() } });
  if (activeAuction) {
    return next(new ErrorHandler("You already have one active auction.", 400));
  }

  try {
    const cloudinaryResponse = await cloudinary.uploader.upload(image.tempFilePath, {
      folder: "MERN_AUCTION_PLATFORM_AUCTIONS",
    });

    if (!cloudinaryResponse || cloudinaryResponse.error) {
      console.error("Cloudinary error:", cloudinaryResponse.error || "Unknown cloudinary error.");
      return next(new ErrorHandler("Failed to upload auction image to cloudinary.", 500));
    }

    const auctionItem = await Auction.create({
      title,
      description,
      category,
      condition,
      startingBid: Number(startingBid), // ✅ Convert to Number
      startTime: startTimeDate,
      endTime: endTimeDate,
      image: {
        public_id: cloudinaryResponse.public_id,
        url: cloudinaryResponse.secure_url,
      },
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: `Auction item created and will be listed at ${startTime}`,
      auctionItem,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message || "Failed to create auction.", 500));
  }
});


export const getAllItems = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find().select("title description category condition startingBid startTime endTime image"); 
  res.status(200).json({ success: true, items });
});


export const getAuctionDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }

  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }

  const bidders = auctionItem.bids ? auctionItem.bids.sort((a, b) => b.amount - a.amount) : [];

  res.status(200).json({ success: true, auctionItem, bidders });
});


export const getMyAuctionItems = catchAsyncErrors(async (req, res, next) => {
  const items = await Auction.find({ createdBy: req.user._id });
  res.status(200).json({ success: true, items });
});


export const removeFromAuction = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }

  const auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }

  await auctionItem.deleteOne();

  res.status(200).json({ success: true, message: "Auction item deleted successfully." });
});


export const republishItem = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler("Invalid Id format.", 400));
  }
  let auctionItem = await Auction.findById(id);
  if (!auctionItem) {
    return next(new ErrorHandler("Auction not found.", 404));
  }
  if (!req.body.startTime || !req.body.endTime) {
    return next(
      new ErrorHandler("Starttime and Endtime for republish is mandatory.")
    );
  }
  if (new Date(auctionItem.endTime) > Date.now()) {
    return next(
      new ErrorHandler("Auction is already active, cannot republish", 400)
    );
  }
  let data = {
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
  };
  if (data.startTime < Date.now()) {
    return next(
      new ErrorHandler(
        "Auction starting time must be greater than present time",
        400
      )
    );
  }
  if (data.startTime >= data.endTime) {
    return next(
      new ErrorHandler(
        "Auction starting time must be less than ending time.",
        400
      )
    );
  }

  if (auctionItem.highestBidder) {
    const highestBidder = await User.findById(auctionItem.highestBidder);
    if (!highestBidder) {
        console.log("Highest bidder user not found in DB!");
    } else {
        highestBidder.moneySpent -= auctionItem.currentBid;
        console.log("Updated moneySpent:", highestBidder.moneySpent);
        highestBidder.auctionWon -= 1;
        await highestBidder.save();
    }
} else {
    console.log("No highest bidder for this auction.");
}


  data.bids = [];
  data.commissionCalculated = false;
  data.currentBid = 0;
  data.highestBidder = null;
  auctionItem = await Auction.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });
  await Bid.deleteMany({ auctionItem: auctionItem._id });
  const createdBy = await User.findByIdAndUpdate(
    req.user._id,
    { unpaidCommission: 0 },
    {
      new: true,
      runValidators: false,
      useFindAndModify: false,
    }
  );
  res.status(200).json({
    success: true,
    auctionItem,
    message: `Auction republished and will be active on ${req.body.startTime}`,
    createdBy,
  });
});