import { User } from "../models/userSchema.js";
import { paymentProof } from "../models/commissionproofSchema.js";
import { Commissions } from "../models/commissionSchema.js";
import cron from "node-cron";
import { sendEmail } from "../utils/sendEmail.js";

export const verifyCommissionCron = () => {

  cron.schedule("*/1 * * * *", async () => {
    
    console.log("Running Verify Commission Cron...");
    const approvedProofs = await paymentProof.find({ status: "Approved" });
    for (const proof of approvedProofs) {
      try {
        const user = await User.findById(proof.userId);
       
        let updatedUserData = {};
        if (user) {
          if (user.unpaidCommission >= proof.amount) {
            updatedUserData = await User.findByIdAndUpdate(
              user._id,
              {
                $inc: {
                  unpaidCommission: -proof.amount,
                },
              },
              { new: true }
            );
            await paymentProof.findByIdAndUpdate(proof._id, {
              status: "Settled",
            });
          } else {
            updatedUserData = await User.findByIdAndUpdate(
              user._id,
              {
                unpaidCommission: 0,
              },
              { new: true }
            );
            await paymentProof.findByIdAndUpdate(proof._id, {
              status: "Settled",
            });
          }
          await Commissions.create({
            amount: proof.amount,
            user: user._id,
          });
          const settlementDate = new Date(Date.now())
            .toString()
            .substring(0, 15);

          const subject = `Your Payment Has Been Successfully Verified And Settled`;
          const message = `
  <p>Dear ${user.userName},</p>

  <p>We are pleased to inform you that your recent payment has been <b>successfully verified and settled</b>. 
  Thank you for promptly providing the necessary proof of payment. Your account has been updated, 
  and you can now proceed with your activities on our platform without any restrictions.</p>

  <h3>Payment Details:</h3>
  <ul>
    <li><b>Amount Settled:</b> ${proof.amount}</li>
    <li><b>Unpaid Amount:</b> ${updatedUserData.unpaidCommission}</li>
    <li><b>Date of Settlement:</b> ${settlementDate}</li>
  </ul>

  <p>Best regards,</p>
  <p><b>WinWager, Auction Team</b></p>
`;
          sendEmail({ email: user.email, subject, message });
        }
       
      } catch (error) {
        console.error(
          `Error processing commission proof for user ${proof.userId}: ${error.message}`
        );
      }
    }
  });
};
