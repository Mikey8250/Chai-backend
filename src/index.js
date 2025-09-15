// require("dotenv").config({ path: "../.env" });

// import mongoose from "mongoose";
// import { DB_NAME } from "./constant";

import { app } from "./app.js";
import connectDB from "./DB/index.js";
import dotenv from "dotenv";

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERRR: ", error);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is listening on ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed!!! ", err);
  });

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
