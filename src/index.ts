import express from "express";
import dotenv from "dotenv";
import { prisma } from "./db/index.js";
import cors from "cors";
import cookieParser from "cookie-parser"

dotenv.config();

const app = express();

const PORT = process.env.PORT || 8080;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    credentials : true
}));
app.use(cookieParser());


app.get("/", (req, res) => {
    res.send("Server is running");
});


import userRouter from "./routers/user.routes.js"

app.use("/api/v1/user" , userRouter)



// Connect database and start server
const startServer = async () => {
    try {
        await prisma.$connect();

        console.log("PostgreSQL connected successfully");

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Database connection failed:", error);
        process.exit(1);
    }
};

startServer();