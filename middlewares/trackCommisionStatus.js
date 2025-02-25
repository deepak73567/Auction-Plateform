import {User} from "../models/userSchema.js";
import {catchAsyncErrors} from "../middlewares/catchAsyncErrors.js";
import ErrorHandler   from "../middlewares/error.js";


export const trackCommisionStatus=catchAsyncErrors(async(req,res,next)=>{
   const user=await User.findById(req.user._id);
   if(user.unpaidCommission > 0){
    return next(new ErrorHandler("you have unpaid commissions. please pay them before a new auction",400));
   }
   next();
})