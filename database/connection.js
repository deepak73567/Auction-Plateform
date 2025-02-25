import mongoose  from "mongoose";

export const connection=()=>{
    mongoose.connect(process.env.MONGO_URI,{

        dbName:"Auction_Plateform"
    }).then(()=>{
        console.log("Connected Successfully");
    }).catch(err=>{
        console.log(`some error occured while connecting to database:${err}`);
    })
}