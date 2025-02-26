import cron from "node-cron";
import { Auction } from "../models/auctionSchema.js";
import { User } from "../models/userSchema.js";
import { Bid } from "../models/bidSchema.js";
import { sendEmail } from "../utils/sendEmail.js";
import { calculateCommission } from "../controllers/commissionController.js";

export const endedAuctionCron = () => {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    console.log("Cron for ended auction running......");

    try {
      const endedAuctions = await Auction.find({
        endTime: { $lt: now },
        commissionCalculated: false,
      });

      
      

      for (const auction of endedAuctions) {
        try {
          const commissionAmount = await calculateCommission(auction._id);
          auction.commissionCalculated = true;

          const highestBidder = await Bid.findOne({
            auctionItem: auction._id,
            amount: auction.currentBid,
          });


          const auctioneer = await User.findById(auction.createdBy);
          if (!auctioneer) {
            console.error(`Auctioneer not found for auction ${auction._id}`);
            continue;
          }

          if (highestBidder) {
            auction.highestBidder = highestBidder;
            await auction.save();

            const bidder = await User.findById(highestBidder.bidder.id);
            if (!bidder) {
              console.error(`Bidder not found: ${highestBidder.bidder.id}`);
              continue;
            }

            await User.findByIdAndUpdate(
              bidder._id,
              {
                $inc: {
                  moneySpent: highestBidder.amount,
                  auctionWon: 1,
                },
              },
              { new: true }
            );

            await User.findByIdAndUpdate(
              auctioneer._id,
              {
                $inc: {
                  unpaidCommission: Math.ceil(commissionAmount),
                },
              },
              { new: true }
            );

            
            const subject = `🎉 Congratulations! You Won an Auction on Deepak Auction 🎉`;
            const message = `
              <p>Dear ${User.userName},</p>
            
              <p>We are thrilled to inform you that you have <b>successfully won</b> an auction on our platform! 
              Your bid was the highest, and the item is now yours.</p>
            
              <h3>Auction Details:</h3>
              <ul>
                <li><b>Item Name:</b> ${auction.title}</li>
                <li><b>Winning Bid:</b> ${highestBidder.amount}</li>
                <li><b>Auction End Date:</b> ${auction.endTime}</li>
              </ul>
            
              <p>To proceed with the payment and item collection, please contact the auctioneer at:</p>
              <ul>
                <li><b>Email:</b> ${auctioneer.email}</li>
                <li><b>Unpaid Commission:</b> ${Math.ceil((highestBidder.amount)*.05)}</li>
                <li>After paying Unpaid Commission You will get Approved mail..</li>
              </ul>
            
              <p>Once payment is confirmed, the item will be shipped to you accordingly.</p>
            
              <p>Thank you for participating, and we hope to see you in more auctions soon!</p>
            
              <p>Best regards,</p>
              <p><b>Deepak Auction Team</b></p>
            `;
            
           
            
            try {
              await sendEmail({ email: bidder.email, subject, message });
              console.log("SUCCESSFULLY SENT EMAIL TO HIGHEST BIDDER");
            } catch (emailError) {
              console.error("Failed to send email:", emailError);
            }
          } else {
            await auction.save();
          }
        } catch (error) {
          console.error("Error processing auction:", auction._id, error);
        }
      }
    } catch (error) {
      console.error("Error running endedAuctionCron:", error);
    }
  });
};
