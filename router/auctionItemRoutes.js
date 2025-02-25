import express from "express";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.js";
import {
  addNewAuctionItem,
  getAllItems,
  getAuctionDetails,
  getMyAuctionItems,
  removeFromAuction,
  republishItem
} from "../controllers/auctionController.js";
import { trackCommisionStatus } from "../middlewares/trackCommisionStatus.js";

const router = express.Router();

// Debugging middleware
router.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

// Define /myitems route before /auction/:id
router.get("/myitems", isAuthenticated, isAuthorized("Auctioneer"), getMyAuctionItems);

// Other routes
router.post("/create", isAuthenticated, isAuthorized("Auctioneer"),trackCommisionStatus, addNewAuctionItem);
router.get("/allItems", getAllItems);
router.get("/allItems/auction/:id", isAuthenticated, getAuctionDetails);
router.delete("/delete/:id", isAuthenticated, isAuthorized("Auctioneer"), removeFromAuction);
router.put("/item/republish/:id", isAuthenticated, isAuthorized("Auctioneer"),  republishItem);

export default router;