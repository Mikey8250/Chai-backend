// require("dotenv").config({ path: "../.env" });

// import mongoose from "mongoose";
// import { DB_NAME } from "./constant";

import connectDB from "./DB/index.js";
import dotenv from "dotenv";

connectDB();

dotenv.config({
  path: "./env",
});

/*
import express from "express";
const app = express();
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("errror", (error) => {
      console.log("ERRR: ", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log("Server is listening on: ", `${process.env.PORT}`);
    });
  } catch (error) {
    console.log("Error:", error);
    throw err;
  }
})();
*/
