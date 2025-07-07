import jwt from "jsonwebtoken";
// import { JWT_SECRET } from "../config/index.js";
import crypto from 'crypto';
const JWT_SECRET =process.env.JWT_SECRET

export const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  
};

export const generateJWT = (payload, expiresIn = '1y') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn })
};

export const verifyJWT = (token) => {
    return jwt.verify(token, JWT_SECRET)
};

 export const verifyUserAuthToken = async (req, res, next) => {
   try {
 
     let userToken =
       req.headers["x-access-token"] || req.headers["authorization"];
     if (
       typeof userToken != "undefined" &&
       userToken != null &&
       userToken != ""
     ) {
       let splitToken = userToken.split(" ")[0];
       let tokenRes = jwt.verify(splitToken, JWT_SECRET);
       if (tokenRes) {
         req.userAddress = tokenRes.id || "";
         next();
       } else {
         res.status(440).json({
           status: false,
           statusCode: 440,
           message: "Session expired",
         });
         res.end();
       }
     } else {
       res.status(401).json({
         status: false,
         statusCode: 401,
         message: "Unauthorized request!",
       });
       res.end();
     }
   } catch (err) {
     res.status(440).json({
       status: false,
       statusCode: 440,
       message: "Unauthorized request",
     });
     res.end();
   }
 };

export const generateReferralCode = (length = 16) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
};