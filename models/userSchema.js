import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

 const userSchema=new mongoose.Schema({
    userName:{
        type:String,
        minLength:[3,"UserName must contain at least 3 characters."],
        maxLength:[40,"UserName cant't excced 40 characters."],
    },
    password:{
        type:String,
        selected:false,
        minLength:[8,"Password must contain at least 8 characters."],
        

    },
    email:String,
    address:String,
    phone:{
        type:String,
        minLength:[10,"Phone Number must contain at least 10 digit."],
        maxLength:[10,"Phone Number can't excced 10 digit."],

    },
    profileImage:{
        public_id:{
            type:String,
            required:true
        },
        url:{
            type:String,
            required:true,
        },
    },

    PaymentMethods:{
        bankTransfer:{
            bankAccountNumber:String,
            bankAccountName:String,
            bankName:String,
        },
        GooglePay:{
          GooglePayAccountNumber:Number  
        },
        paypal:{
            paypalEmail:String,
        },
    },
     role:{
     type:String,
     enum:["Auctioneer","Bidder","Super Admin"]
     },
     unpaidCommission:{
        type:Number,
        default:0,
     },
     auctionWon:{
        type:Number,
        default:0
     },
     moneySpent:{
        type:Number,
        default:0
     },
     createdAt:{
        type:Date,
        default:Date.now
     }
});
userSchema.pre("save",async function (next) {
    if(!this.isModified("password")){
        next();
    }
    this.password=await bcrypt.hash(this.password,10);
    
});

userSchema.methods.comparePassword=async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword,this.password);
}
userSchema.methods.generateJsonWebToken=function(){
    console.log(`jwt:${this.id}`);
    return jwt.sign({id:this._id},process.env.Jwt_SECRET_KEY,{
        

        expiresIn:process.env.Jwt_EXPIRE,
    }
    );
}
export const User=mongoose.model("User",userSchema);
