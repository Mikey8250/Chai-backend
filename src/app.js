import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { LIMIT } from "./constant.js";

const app = express();

// configuring Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: LIMIT }));
app.use(express.static("public"));
app.use(cookieParser());

// routes import
import userRouter from "./routes/user.routes.js";

// routes declaration
app.use("/api/v1/users", userRouter);

//http://localhost:8000//api/v1/users/register

export { app };
