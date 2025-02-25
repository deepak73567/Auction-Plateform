import { config } from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { connection } from "./database/connection.js";
import { errorMiddleware } from "./middlewares/error.js";
import userRouter from "./router/userRouters.js";
import AuctionRouter from "./router/auctionItemRoutes.js";
import bidRouter from "./router/bidRoutes.js";
import commissionRouter from "./router/commisionRouter.js";
import SuperAdminRouter from "./router/superAdminRouter.js";
import {endedAuctionCron}   from "./automation/endedAuctionCron.js";
import {verifyCommissionCron} from "./automation/verifyCommissionCron.js";
const app = express();
config({
  path: "./config/config.env",
});

app.use(cors({
  origin: [process.env.FRONTEND_URL],
  methods: ["POST", "GET", "PUT", "DELETE"],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/",
}));

// app.get('/', (req, res) => {
//   res.send('Hello World!');
// });

app.use("/api/v1/user", userRouter);
app.use("/api/v1/auctionitem", AuctionRouter);
app.use("/api/v1/bid", bidRouter);
app.use("/api/v1/commission",commissionRouter);
app.use("/api/v1/superadmin",SuperAdminRouter);

endedAuctionCron();
verifyCommissionCron();
connection();
app.use(errorMiddleware);

export default app;