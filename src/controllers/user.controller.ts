import type { Request , Response } from "express";
import { prisma } from "../db/index.js";
import { uploadOnCloudinary } from "../services/cloudinary.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"


export const registerUser = async(req : Request , res : Response) =>{
    try{
        const { fullName, email, username, password } = req.body;

    // Validate fields
    if (
        [fullName, email, username, password].some(
            (field) => !field || field.trim() === ""
        )
    ) {
        throw new Error("all fields are required");
    }

    // Check if user already exists
    const existedUser = await prisma.user.findFirst({
        where: {
            OR: [
                { username: username.toLowerCase() },
                { email: email.toLowerCase() }
            ]
        }
    });

    if (existedUser) {
        throw new Error("User with email or username already exists");
    }

    // Get avatar and cover image paths
    const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
    } | undefined;

    const avatarLocalPath = files?.avatar?.[0]?.path;

    const coverImageLocalPath = files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new Error("Avatar file is required");
    }

    // Upload images to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const coverImage = coverImageLocalPath
        ? await uploadOnCloudinary(coverImageLocalPath)
        : null;

    if (!avatar) {
        throw new Error("Avatar upload failed");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in PostgreSQL
    const user = await prisma.user.create({
        data: {
            fullName,
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            avatar: avatar.url,
            refreshToken: ""
        }
    });

    // Generate access token
    const accessToken = jwt.sign(
        {
            _id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET!,
        {
            expiresIn: (process.env.ACCESS_TOKEN_EXPIRY || "15m") as jwt.SignOptions["expiresIn"],
        }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
        {
            _id: user.id
        },
        process.env.REFRESH_TOKEN_SECRET!,
        {
            expiresIn: (process.env.REFRESH_TOKEN_EXPIRY || "7d") as jwt.SignOptions["expiresIn"]
        }
    );

    // Save refresh token in database
    await prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            refreshToken
        }
    });

    // Get created user without password and refresh token
    const createdUser = await prisma.user.findUnique({
        where: {
            id: user.id
        },
        select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            avatar: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!createdUser) {
        throw new Error("Something went wrong while registering the user");
    }

    // Return response
    return res.status(201).json({
                user: createdUser,
                accessToken,
                refreshToken
            })

    }catch(e){
        console.log(e);
    }
}