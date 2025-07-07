import User from "../../models/user.js";
import Interest from "../../models/areaOfInterest.js";
import Events from "../../models/events.js";
import Offer from "../../models/offers.js";
import Orders from "../../models/orderDetails.js";
import ContactUs from "../../models/contactUs.js";
import uploadFile, { multipleImageUpload } from "../../config/s3.js";
import moment from "moment";
import {
  generateJWT,
  generateOTP,
  generateReferralCode,
  verifyJWT,
} from "../../services/helper.js";
import { sendMail, sendSMS } from "../../services/smtp.js";
import bcrypt from "bcryptjs";
import events from "../../models/events.js";
import bankDetails from "../../models/bankDetails.js";
import rating from "../../models/rating.js";
import QRCode from "qrcode";
import qs from "qs";
import https from "https";
import axios from "axios";
import firebase from "../../config/firebase.js";
import depositHistory from "../../models/depositHistory.js";
import platformFee from "../../models/platformFee.js";
import ScannerUser from "../../models/scannerLogin.js"
import { sendEventNotification } from "../../services/notifications.js";
import Notification from "../../models/notification.js";
import webContactUs from '../../models/webContactUs.js'
import { log } from "console";
import cron from 'node-cron';
const afrimoney_baseUrl = process.env.afri_money_base_url;
const receiver_idValue = process.env.receiver_idValue;
const afri_money_tpin = process.env.afri_money_tpin;
 const transactor_idValue=process.env.transactor_idValue
const transactor_money_tpin =process.env.transactor_money_tpin

const token = process.env.afri_money_token;
const enquiryUrl = process.env.afri_money_enquiryUrl;
console.log("transactor_idValue---------------------",transactor_money_tpin)
      console.log("enquiryUrl------------------",enquiryUrl);
      console.log("token------------------",token);


function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}


// cron.schedule('*/1 * * * *', async () => {
//   console.log('🕐 Running cart cleanup job...');

//   try {
//     // Get all placed orders
//     const orders = await depositHistory.find({
//       status: 'PAUSED',  
//       createdAt: { $gte: new Date(Date.now() - 120000 * 1000) } 
//     });

//     console.log("orders",orders?.externalReferenceId)

//   } catch (error) {
//     console.error('❌ Cron job error:', error.message);
//   }
// });



cron.schedule('*/20 * * * * *', async () => {
  console.log('🕐 Running Afrimoney payment status check...');

  try {
    const orders = await depositHistory.find({
      // status: 'PAUSED',
      status: "PAUSED",
      createdAt: { $gte: new Date(Date.now() - 120000 * 1000) }, // last 2 mins
    });

    if (!orders.length) {
      console.log("📭 No PAUSED orders found.");
      return;
    }

    const externalIds = orders.reduce((acc, order) => {
      if (order.externalReferenceId) acc.push({ id: order.externalReferenceId, dbId: order._id });
      return acc;
    }, []);
console.log("externalIds",externalIds)
    for (const item of externalIds) {
      const payload = {
        COMMAND: {
          TYPE: "FTXNENQ",
          FTXNID: item.id,
        },
      };
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      try {
        const response = await axios.post(enquiryUrl, payload, { headers });
        console.log("response",response)
        const statusData = response.data.COMMAND;
        const code = statusData.STATUSCODE;

        switch (code) {
          case "TS":
            console.log(`✅ Transaction ${item.id} is successful. Updating DB...`);
            console.log("item.dbId",item.dbId)
           const deposit =  await depositHistory.findByIdAndUpdate(item.dbId, {
              status: "PAID",
              STATUSCODE: code,
              txnStatus:"PAID",
              TXNDATE: statusData.TXNDATE || "",
              TRANSID: statusData.TRANSID || "",
              TXNAMT: statusData.TXNAMT || "",
              TXNID: statusData.TXNID || "",
              updatedAt: new Date()
            });
            if(deposit){
            //   const daysssss = await Orders.findOne({transactionId:item.id})
            // console.log("item========================.dbId",daysssss)

                 await Orders.findOneAndUpdate({transactionId:item.id}, {
              payment_status: "PAID",
              
           
              updatedAt: new Date()
            });
            }
            break;
          case "TF":
             const deposits =  await depositHistory.findByIdAndUpdate(item.dbId, {
              status: "FAILED",
              STATUSCODE: code,
              txnStatus:"FAILED",
              TXNDATE: statusData.TXNDATE || "",
              TRANSID: statusData.TRANSID || "",
              TXNAMT: statusData.TXNAMT || "",
              TXNID: statusData.TXNID || "",
              updatedAt: new Date()
            });
                   await Orders.findOneAndUpdate({transactionId:item.id}, {
              payment_status: "FAILED",
              
           
              updatedAt: new Date()
            });
            console.log(`❌ Transaction ${item.id} failed.`);
            break;
          case "TA":
                 const depositss =  await depositHistory.findByIdAndUpdate(item.dbId, {
              status: "AMBIGUOUS",
              STATUSCODE: code,
              txnStatus:"AMBIGUOUS",
              TXNDATE: statusData.TXNDATE || "",
              TRANSID: statusData.TRANSID || "",
              TXNAMT: statusData.TXNAMT || "",
              TXNID: statusData.TXNID || "",
              updatedAt: new Date()
            });
             await Orders.findOneAndUpdate({transactionId:item.id}, {
              payment_status: "AMBIGUOUS",
              
           
              updatedAt: new Date()
            });
            console.log(`⚠️ Transaction ${item.id} is ambiguous.`);
            break;
          case "TPI":
          case "TIP":
                 const depositsss =  await depositHistory.findByIdAndUpdate(item.dbId, {
              status: "INPROGRESS",
              STATUSCODE: code,
              txnStatus:"INPROGRESS",
              TXNDATE: statusData.TXNDATE || "",
              TRANSID: statusData.TRANSID || "",
              TXNAMT: statusData.TXNAMT || "",
              TXNID: statusData.TXNID || "",
              updatedAt: new Date()
            });
              await Orders.findOneAndUpdate({transactionId:item.id}, {
              payment_status: "INPROGRESS",
              
           
              updatedAt: new Date()
            });
            console.log(`⏳ Transaction ${item.id} is in progress.`);
            break;
          case "TI":
              const depositssss =  await depositHistory.findByIdAndUpdate(item.dbId, {
              status: "INITIATED",
              STATUSCODE: code,
              txnStatus:"INITIATED",
              TXNDATE: statusData.TXNDATE || "",
              TRANSID: statusData.TRANSID || "",
              TXNAMT: statusData.TXNAMT || "",
              TXNID: statusData.TXNID || "",
              updatedAt: new Date()
            });
              await Orders.findOneAndUpdate({transactionId:item.id}, {
              payment_status: "INITIATED",
              
           
              updatedAt: new Date()
            });
            console.log(`🔄 Transaction ${item.id} is initiated.`);
            break;
          default:
             
            console.log(`❓ Unknown status for ${item.id}: ${code}`);
        }

      } catch (err) {
        console.error(`❌ Error checking transaction ${item.id}:`, err.message);
      }
    }

  } catch (error) {
    console.error('❌ Cron job error:', error.message);
  }
});



const getToken = async () => {
  const url = afrimoney_baseUrl+"token";
  const data = qs.stringify({
    grant_type: "client_credentials",
  });
  const config = {
    method: "post",
    url: url,
    headers: {
      Authorization:
        "Basic azhOMklYWnZ6elZUMjVWR2hhYXR4ZDRnczZvYTp3ZEM2d29DNnJoQ01oSDl2eEc0bUV6R0R4RDRh)",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  };
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getPaymentToken = async (req, res) => {
  try {
    const tokenData = await getToken();
    res.status(200).json({
      message: "Token retrieved successfully",
      data: tokenData,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


export const cashIn = async (req, res) => {
  try {
    const val = req.body;
    const url = afrimoney_baseUrl+"CashIn";
    const requestData = {
      serviceCode: "CASHIN",
      bearerCode: "USSD",
      language: "en",
      initiator: "transactor",
      transactionAmount: val.amount,
      currency: "101",
      externalReferenceId: generateReferralCode(),
      source: "3rd Party Source Name",
      remarks: "Deposit",
      transactionMode: "transactionMode",
      transactor: {
        idType: "mobileNumber",
        idValue: val.idValue,
        productId: "12",
        mpin: val.mpin,
        tpin: afri_money_tpin,
      },
      receiver: {
        idType: "mobileNumber",
        idValue: receiver_idValue,
        productId: "12",
      },
    };
    const headers = {
      Authorization: `Bearer ${val.token}`,
      "Content-Type": "application/json",
    };
    const response = await axios.post(url, requestData, { headers });
    await depositHistory.create({
      ...requestData,
      txnStatus: response?.data?.status || "PENDING",
      serviceRequestId: response?.data?.serviceRequestId || "",
      message: response?.data?.message || "",
      transactionId: response?.data?.transactionId || "",
      mfsTenantId: response?.data?.mfsTenantId,
      language: response?.data?.language,
      serviceFlow: response?.data?.serviceFlow,
      remarks: response?.data?.remarks,
      originalServiceRequestId: response?.data?.originalServiceRequestId,
      status: response?.data?.status,
    });
    res.status(200).json({
      message: "Token retrieved successfully",
      data: response.data,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const merchantPayment = async (req, res) => {
  try {
    const id = req.userAddress;
    const tnxids = generateReferralCode();
    const val = req.body;
    console.log("val", val);
    const url = afrimoney_baseUrl+"MERCHPAY";
    const requestData = {
      serviceCode: "MERCHPAY",
      transactionAmount: val.amount,
      initiator: "transactor",
      currency: "101",
      bearerCode: "USSD",
      language: "en",
      externalReferenceId:  tnxids,
      remarks: "test_ch_33",
      transactor: {
        idType: "mobileNumber",
        productId: "12",
        idValue: transactor_idValue,
        mpin: transactor_money_tpin,
      },
      sender: {
        idType: "mobileNumber",
        productId: "12",
        idValue: val.idValue,
      },
    };
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await axios.post(url, requestData, { headers });
    // res.status(200).json({
    //   message: "Token retrieved successfully",
    //   data: response.data,
    // });
    //  const response = await axios.post(url, requestData, { headers });

    
   const updata = await depositHistory.create({
      ...requestData,
      txnStatus: response?.data?.status || "PENDING",
      serviceRequestId: response?.data?.serviceRequestId || "",
      message: response?.data?.message || "",
      transactionId: response?.data?.transactionId || "",
      mfsTenantId: response?.data?.mfsTenantId,
      language: response?.data?.language,
      serviceFlow: response?.data?.serviceFlow,
      remarks: response?.data?.remarks,
      originalServiceRequestId: response?.data?.originalServiceRequestId,
      status: response?.data?.status,
      userId:id,
    });
 
    res.status(200).json({
      message: "Token retrieved successfully",
      data: response.data,
      tnxids: requestData.externalReferenceId,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const checkTransactionStatus = async (req, res) => {
  const { ftxnId, token } = req.body;
  const enquiryUrl = "https://api.sandbox.afrimoney.gm/TransactionEnquiry";
  const payload = {
    COMMAND: {
      TYPE: "FTXNENQ",
      FTXNID: ftxnId,
    },
  };
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.post(enquiryUrl, payload, { headers });
    const statusData = response.data.COMMAND;
    console.log("FE25statusData0624.1230.A33226",statusData)
    switch (statusData.STATUSCODE) {
      case "TS":
        console.log("✅ Transaction successful.");
        break;
      case "TF":
        console.log("❌ Transaction failed.");
        break;
      case "TA":
        console.log("⚠️ Transaction ambiguous.");
        break;
      case "TPI":
      case "TIP":
        console.log("⏳ Transaction in progress.");
        break;
      case "TI":
        console.log("🔄 Transaction initiated.");
        break;
      default:
        console.log("❓ Unknown or not found.");
    }
    res.status(201).json({
      status: true,
      message: "Payment Data Fetch Successfully",
      data: statusData,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: "Server error", err });
  }
};




export const signupUser = async (req, res) => {
  const { name, email, phone, password, fcmToken,type } = req.body;
  let query = {};
  if (email) {
    query = { email };
  } else if (phone) {
    query = { phone };
  } else {
    query = {
      $or: [{ email }, { phone }],
    };
  }
  try {
    const existingUser = await User.findOne(query);
    if (existingUser) {
      return res.status(400).json({
        message: "Email or phone number is already in use",
      });
    }
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const user = await User.create({
      name,
      email,
      phone,
      password,
      otp,
      otpExpiresAt,
      fcmToken,
      type,
    });
    res.status(201).json({
      message: "User registered successfully",
      data: otpExpiresAt,
      users: user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const sendOTP = async (req, res) => {
  const { user:identifier } = req.body;
  console.log("req.body",req.body)
  if (!identifier)
    return res
      .status(400)
      .json({ message: "Email or phone number is required" });
  try {
    let user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    const isEmail = identifier.indexOf("@") > 0;
    if (isEmail) {
      let otpres = await sendMail({
        to: identifier,
        subject: "Registration OTP | Velica",
        text: `Your Velica Registration OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes. Please use it promptly!`,
      });
      console.log("otpres", otpres);
    } else {
      let otpres = await sendSMS(
        identifier.startsWith("+220") ? identifier : "+220" + identifier,
        `Your Velica Registration OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes. Please use it promptly!`
      );
    }
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.log("ero",error)
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyOTP = async (req, res) => {
  const { user: identifier, otp } = req.body;
  if (!identifier) {
    return res.status(400).json({ message: "Email or Phone is required" });
  }
  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }
  try {
    let user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }
    user.otp = null;
    user.otpExpiresAt = null;
    user.isVerified = true;
    const userdata = await user.save();
    const token = generateJWT({ id: user._id });
    res.status(200).json({
      status: true,
      token,
      message: "OTP verified successfully",
      user: userdata,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const signinUser = async (req, res) => {
  const { user: identifier, password, fcmToken,type } = req.body;
  if (!identifier) {
    return res.status(400).json({ message: "Email or Phone is required" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }
  try {
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (user.fcmToken != fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }
    if (!user) {
      return res.status(400).json({ message: "Invalid email/phone" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Incorrect password" });
    }
    const token = generateJWT({ id: user._id });
    res.status(200).json({
      message: "Login successful",
      token,
      data: user._id,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const oAuth = async (req, res) => {
  try {
    const { email, name, image, fcmToken } = req.body;
    console.log("req.body", req.body);
    let userId;

    try {
      const userExists = await User.findOne({ email });
      console.log("userExists", userExists);

      if (!userExists) {
        const newUser = new User({
          name,
          email,
          image: image ? image : "",
          isOAuth: true,
        });
        await newUser.save();
        userId = newUser._id;
        console.log("userId", userId);
      } else {
        userId = userExists._id;
        await User.updateOne({ email: email }, { fcmToken: fcmToken });
      }
      const token = generateJWT({ id: userId });

      await User.updateOne(
        { email: email },
        { isLogin: true, fcmToken: fcmToken }
      );
      res.status(200).json({
        message: "Login successful",
        token,
        data: userId,
      });
    } catch (error) {
      res.json({
        status: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  } catch (error) {
    console.log("error", error);
    return res.json({ status: false, message: "Internal Server Error" });
  }
};

export const resendOTP = async (req, res) => {
  const { user: identifier } = req.body;
  if (!identifier) {
    return res
      .status(400)
      .json({ status: false, message: "Email or phone number is required" });
  }
  try {
    let user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }
    if (user.otpExpiresAt && new Date() < user.otpExpiresAt) {
      return res.status(400).json({
        message: "OTP is still valid. Please wait before requesting again.",
      });
    }
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    const isEmail = identifier.indexOf("@") > 0;
    if (isEmail) {
      await sendMail({
        to: identifier,
        subject: "Resend OTP | Velica",
        text: `Your new Velica OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes.`,
      });
    } else {
      await sendSMS(
        identifier.startsWith("+220") ? identifier : "+220" + identifier,
        `Your new Velica OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes.`
      );
    }
    res
      .status(200)
      .json({ status: true, message: "New OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getSignedInUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userAddress }).select(
      "-password"
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res
      .status(200)
      .json({ status: true, message: "User details retrieved", user });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { user: identifier } = req.body;
  if (!identifier)
    return res
      .status(400)
      .json({ message: "Email or phone number is required" });
  try {
    let user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    const isEmail = identifier.indexOf("@") > 0;
    if (isEmail) {
      let otpres = await sendMail({
        to: identifier,
        subject: "Reset Password OTP | Velica",
        text: `Your Velica Reset Password OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes. Please use it promptly!`,
      });
    } else {
      let otpres = await sendSMS(
        identifier.startsWith("+220") ? identifier : "+220" + identifier,
        `Your Velica Reset Password OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes. Please use it promptly!`
      );
    }
    const token = generateJWT({ id: user._id });
    res.status(200).json({ message: "OTP sent successfully", token });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyResetOTP = async (req, res) => {
  const { user: identifier, otp } = req.body;
  if (!identifier) {
    return res.status(400).json({ message: "Email or Phone is required" });
  }
  if (!otp) {
    return res.status(400).json({ message: "OTP is required" });
  }
  try {
    let user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (!user || user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }
    const token = generateJWT({ id: user._id });
    user.otp = null;
    user.otpExpiresAt = null;
    user.resetToken = token;
    await user.save();
    res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      resetToken: token,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
    const userId = decoded.id;
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (token !== user.resetToken) {
      return res.status(400).json({ message: "Invalid reset token" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = newPassword;
    user.password = hashedPassword;
    user.resetToken = null;
    await user.save();
    res.json({ message: "Password reset successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to reset password", error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {  name, about, areaOfInterest } = req.body;
    const userId = req.userAddress;
    console.log("req.body",req.body)
    console.log("userId",userId)

  
   
    const user = await User.findOne({_id:userId});
    console.log("user",user)

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    let updatedFields = {
      name: name || user.name,
      about: about || user.about ,
    };
    if (areaOfInterest) {
      try {
        const parsedInterests = JSON.parse(areaOfInterest);
        if (!Array.isArray(parsedInterests)) {
          return res
            .status(400)
            .json({ message: "areaOfInterest must be an array" });
        }
        const validInterests = await Interest.find({
          name: { $in: parsedInterests },
        });
        if (validInterests.length !== parsedInterests.length) {
          return res
            .status(400)
            .json({ message: "Some interests are invalid" });
        }
        updatedFields.areaOfInterest = [...new Set(parsedInterests)];
      } catch (error) {
        return res
          .status(400)
          .json({ message: "Invalid areaOfInterest format" });
      }
    }
    if (req.files && req.files.image) {
      const image = req.files.image;
      const profileImage = await uploadFile(
        image.name,
        image.data,
        image.mimetype
      );
      
      console.log("profileImage",profileImage)

      updatedFields.image = profileImage;
    }
    const updatedUser = await User.findOneAndUpdate(
      {_id:userId},
      { $set: updatedFields },
      { new: true }
    );
    console.log("updatedUser",updatedUser)
 
    if (user.fcmToken&&user.notification===true) {
      const messagePayload = {
        notification: {
          title: "Profile updated successfully",
          body: `${user.name}, you have received a new message via the Profile.`,
        },
        token: user.fcmToken,
      };
      try {
        await firebase.messaging().send(messagePayload);
      } catch (error) {}
    }
  
    res.json({ message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update profile",
      error: error.message,

    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userAddress });
    console.log("user",user)
    if (!user) {
      return res.status(404).json({ message: "User not found", status: false });
    }
    res.status(200).json({
      message: "Profile retrieved successfully",
      status: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to retrieve profile",
      status: false,
      error: error.message,
    });
  }
};

export const areaOfInterest = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    let profileImage = null;
    if (req.files && req.files.image) {
      const image = req.files.image;
      profileImage = await uploadFile(image.name, image.data, image.mimetype);
    }
    const interest = await Interest.create({
      name,
      image: profileImage,
    });
    res.status(201).json({
      message: "Interest created successfully",
      data: interest,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const getAreasOfInterest = async (req, res) => {
  try {
    const interests = await Interest.find({}, "name image");
    res.status(200).json({
      message: "Interests retrieved successfully",
      data: interests,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const addAreaOfInterest = async (req, res) => {
  try {
    const userId = req.userAddress;
    const { interests } = req.body;
    if (!userId || !interests || !Array.isArray(interests)) {
      return res.status(400).json({
        message: "User ID and interests (array) are required",
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const validInterests = await Interest.find({ name: { $in: interests } });
    if (validInterests.length !== interests.length) {
      return res.status(400).json({
        message: "Some interests are invalid",
      });
    }
    user.areaOfInterest = [...new Set([...user.areaOfInterest, ...interests])];
    await user.save();
    res.status(200).json({
      message: "Interests added successfully",
      data: user.areaOfInterest,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const updateAreaOfInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    let interest = await Interest.findById(id);
    if (!interest) {
      return res.status(404).json({ message: "Interest not found" });
    }
    if (name) {
      interest.name = name;
    }
    if (req.files && req.files.image) {
      const image = req.files.image;
      const profileImage = await uploadFile(
        image.name,
        image.data,
        image.mimetype
      );
      interest.image = profileImage;
    }
    await interest.save();
    res.status(200).json({
      message: "Interest updated successfully",
      data: interest,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

export const getUserEvents = async (req, res) => {
  try {
    const userId = req.userAddress;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized access" });
    }
    const events = await Events.find({ createdBy: userId });
    if (events.length === 0) {
      return res.status(404).json({ message: "No events found for this user" });
    }
    const currentDate = moment().format("YYYY-MM-DD");
    const upcomingEvents = [];
    const pastEvents = [];
    const cancelledEvents = [];
    events.forEach((event) => {
      event.venueDetails.forEach((venue) => {
        const eventDate = moment(venue.date, "YYYY-MM-DD");
        const eventTime = moment(venue.time, "HH:mm");
        const eventEndTime = moment(eventDate).add(event.duration, "minutes");
        if (event.status === "reject") {
          cancelledEvents.push(event);
        } else if (eventDate.isSameOrAfter(currentDate)) {
          upcomingEvents.push(event);
        } else if (eventDate.isBefore(currentDate)) {
          pastEvents.push(event);
        }
      });
    });
    res.status(200).json({
      status: true,
      message: "User's events retrieved successfully",
      upcomingEvents,
      pastEvents,
      cancelledEvents,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching events",
      error: error.message,
    });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Events.findById(eventId);
    const user = await User.findById(event.createdBy);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({
      message: "Event retrieved successfully",
      data: event,
      user: user,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching event", error: error.message });
  }
};

export const getVenueTickets = async (req, res) => {
  try {
    const { eventId, venueId } = req.params;
    const event = await Events.findOne(
      { _id: eventId, "venueDetails._id": venueId },
      { "venueDetails.$": 1 }
    );
    if (!event || event.venueDetails.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Event or Venue not found" });
    }
    const tickets = event.venueDetails[0].ticket || [];
    res.status(200).json({
      status: true,
      message: "Tickets retrieved successfully",
      tickets,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching tickets",
      error: error.message,
    });
  }
};

export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find();
    res.status(200).json({ status: true, offers });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};


export const buyticket = async (req, res) => {
  try {
    const {
      eventId,
      venueId,
      couponId,
      name,
      email,
      phone,
      ticket_count,
      noOfTickets,
      transactionId,
      prize,
    } = req.body;

    const userId = req.userAddress;
    const bookingId = generateReferralCode();

    const uset = await User.findById(userId);
    const event = await Events.findOne({
      _id: eventId,
      "venueDetails._id": venueId,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const venue = event.venueDetails.find((v) => v._id.toString() === venueId);
    if (!venue) {
      return res.status(404).json({ message: "Venue not found" });
    }

    for (const item of noOfTickets) {
      const ticketToUpdate = venue.ticket.find(
        (t) => t._id.toString() === item.ticketId
      );

      if (!ticketToUpdate) {
        return res
          .status(404)
          .json({ message: `Ticket not found for team ${item.team}` });
      }

      if (parseInt(ticketToUpdate.remaining_Ticket) < parseInt(item.count)) {
        return res.status(400).json({
          message: `Not enough tickets available for team ${item.team}`,
        });
      }

      ticketToUpdate.remaining_Ticket = (
        parseInt(ticketToUpdate.remaining_Ticket) - parseInt(item.count)
      ).toString();
    }

    await event.save();

    const offer = couponId ? await Offer.findById(couponId) : null;
    const couponCode = offer ? offer.code : "";

    const qrData = JSON.stringify({
      bookingId,
      name,
      email,
      phone,
      ticket_count,
      transactionId,
      prize,
      payment_status: "PAUSED",
      ticketUsed:ticket_count,
    });

    const qrCodeUrl = await QRCode.toDataURL(qrData);

    const newOrder = await Orders.create({
      eventId,
      venueId,
      couponId: couponCode,
      transactionId,
      name,
      email,
      phone,
      ticket_count,
      bookinId: bookingId,
      prize,
      payment_status: "Pending",
      qrCodeUrl,
      userId: userId,
      noOfTickets, 
      image: event.eventImages.map((img) => ({ url: img })),
      organizationName: event.organizationName,
      EventcontactPerson: event.contactPerson,
      EventphoneNumber: event.phoneNumber,
      venueEventName: venue.eventName,
      venueType: venue.venueName,
      venueAddress: venue.address,
      venueDate: venue.date,
      venuetime: venue.time,
      venueLocation: venue.location,
      profileImage: uset.image,
      verifyTicket:false
    });
    const ticketsss = await Notification.create({
      userId,
      title: venue.eventName,
      type: "Ticket",
      eventDate: venue.date,
      timestamp: new Date(),
    });

    if(uset.notification === true) {
    if (uset.fcmToken) {
      const messagePayload = {
        notification: {
          title: "Order created successfully",
          body: `${uset.name}, your ticket has been booked!`,
        },
        token: uset.fcmToken,
      };
      try {
        await firebase.messaging().send(messagePayload);
     
      } catch (err) {

      }
    }
  }
    res
      .status(201)
      .json({ message: "Order created successfully", order: newOrder });
  } catch (error) {
    console.error("Buy ticket error:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getAllEvents = async (req, res) => {
  try {
    const { cat, datetime, price, search, Lat, Lon } = req.query;
    console.log("req.query", req.query);
    const events = await Events.find({ status: "completed" });
    const currentDate = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(currentDate.getDate() + 1);
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    let filteredEvents = events;
    if (cat) {
      const categories = cat.split(",").map((c) => c.trim().toLowerCase());
      filteredEvents = filteredEvents.filter((event) =>
        categories.includes(event.category.toLowerCase())
      );
    }
    if (datetime) {
      filteredEvents = filteredEvents.filter((event) => {
        return event.venueDetails.some((venue) => {
          const eventDate = new Date(venue.date);
          if (datetime === "today") {
            return eventDate.toDateString() === currentDate.toDateString();
          } else if (datetime === "tomorrow") {
            return eventDate.toDateString() === tomorrow.toDateString();
          } else if (datetime === "currentweek") {
            return eventDate >= startOfWeek && eventDate <= endOfWeek;
          }
          return true;
        });
      });
    }
    if (price) {
      const priceRange = price.split("to").map(Number);
      if (
        priceRange.length === 2 &&
        !isNaN(priceRange[0]) &&
        !isNaN(priceRange[1])
      ) {
        const [minPrice, maxPrice] = priceRange;
        filteredEvents = filteredEvents.filter((event) => {
          return event.venueDetails.some((venue) => {
            return venue.ticket.some((ticket) => {
              const ticketPrice = Number(ticket.price);
              return ticketPrice >= minPrice && ticketPrice <= maxPrice;
            });
          });
        });
      }
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredEvents = filteredEvents.filter((event) => {
        return event.venueDetails.some(
          (venue) =>
            venue.eventName.toLowerCase().includes(lowerSearch) ||
            venue.venueName.toLowerCase().includes(lowerSearch)
        );
      });
    }
    const userLat = Lat;
    const userLon = Lon;
    const maxDistance = 50;
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    const categorizedEvents = filteredEvents.reduce(
      (acc, event) => {
        let isNearby = false;
        let isPastEvent = false;
        event.venueDetails.forEach((venue) => {
          const eventDateTime = new Date(`${venue.date} ${venue.time}`);
          const eventLat = Number(venue.lat);
          const eventLon = Number(venue.lng);

          if (currentDate > eventDateTime) {
            acc.pastEvents.push(event);
            isPastEvent = true;
          } else if (
            currentDate.toDateString() === eventDateTime.toDateString()
          ) {
            acc.liveEvents.push(event);
          } else {
            acc.upcomingEvents.push(event);
          }
          if (!isNaN(eventLat) && !isNaN(eventLon)) {
            const distance = calculateDistance(
              userLat,
              userLon,
              eventLat,
              eventLon
            );
            if (distance <= maxDistance) {
              isNearby = true;
            }
          }
        });
        if (
          isNearby &&
          !isPastEvent &&
          !acc.nearByEvent.some(
            (e) => e._id.toString() === event._id.toString()
          )
        ) {
          acc.nearByEvent.push(event);
        }
        return acc;
      },
      { pastEvents: [], liveEvents: [], upcomingEvents: [], nearByEvent: [] }
    );
  
    res.status(200).json({
      message: "Events retrieved successfully",
      ...categorizedEvents,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching events", error: error.message });
  }
};


export const myEventDashboard = async (req, res) => { 
  try {
    const id = req.userAddress;
    const events = await Events.find({ createdBy: id });
    const currentDateTime = new Date();

    const updatedEvents = events.map((event) => {
      if (Array.isArray(event.venueDetails)) {
        event.venueDetails = event.venueDetails.map((venue) => {
          let dateStr = venue.date;
          if (dateStr.includes("/")) {
            dateStr = dateStr.replace(/\//g, "-");
          }
          const eventDateTime = new Date(`${dateStr} ${venue.time}`);

    
          if (event.status === "cancelled") {
            venue.type = "cancelled";
          } else {
            venue.type = eventDateTime > currentDateTime ? "upComing" : "pastEvent";
          }

          return venue;
        });
      }
      return event;
    });

    res.status(200).json({ status: true, data: updatedEvents });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};

export const createEvent = async (req, res) => {
  try {
    const id = req.userAddress;
    let eventData = { ...req.body };

    const imageFiles = req.files;

    let uploadedEventImages = [];
    let uploadedDocuments = [];
    let uploadedBusinessDocuments = [];

    eventData.createdBy = id;
    eventData.remaining_Ticket = eventData.total_Ticket;

    if (imageFiles) {
      if (imageFiles.eventImages) {
        uploadedEventImages = await multipleImageUpload(
          Array.isArray(imageFiles.eventImages)
            ? imageFiles.eventImages
            : [imageFiles.eventImages]
        );
      }
      if (imageFiles.document) {
        uploadedDocuments = await multipleImageUpload(
          Array.isArray(imageFiles.document)
            ? imageFiles.document
            : [imageFiles.document]
        );
      }
      if (imageFiles.businessDocument) {
        uploadedBusinessDocuments = await multipleImageUpload(
          Array.isArray(imageFiles.businessDocument)
            ? imageFiles.businessDocument
            : [imageFiles.businessDocument]
        );
      }
    }

    eventData.eventImages = uploadedEventImages;
    eventData.document =
      uploadedDocuments.length > 0 ? uploadedDocuments[0] : "";
    eventData.businessDocument =
      uploadedBusinessDocuments.length > 0 ? uploadedBusinessDocuments[0] : "";

  
    if (typeof eventData.venueDetails === "string") {
      try {
        eventData.venueDetails = JSON.parse(eventData.venueDetails);
        if (!Array.isArray(eventData.venueDetails)) {
          throw new Error("venueDetails must be an array.");
        }
      } catch (error) {
        return res
          .status(400)
          .json({ status: false, error: "Invalid venueDetails format" });
      }
    }

    if (Array.isArray(eventData.venueDetails)) {
      eventData.venueDetails = eventData.venueDetails.map((venue) => {
        if (Array.isArray(venue.ticket)) {
          venue.ticket = venue.ticket.map((ticket) => ({
            ...ticket,
            remaining_Ticket: ticket.total_Ticket,
          }));
        }
        return venue;
      });
    }

    const newEvent = await events.create(eventData);
    const currentUser = await User.findOne({ _id: id });

  
    await Notification.create({
      userId: id,
      title: eventData.venueDetails?.[0]?.eventName || "New Event",
      type: "event",
      eventDate: eventData.venueDetails?.[0]?.date || null,
    });


    if (currentUser?.fcmToken && currentUser.notification === true) {
      const messagePayload = {
        notification: {
          title: "New Event Created",
          body: `${currentUser.name}, your event has been successfully created!`,
        },
        token: currentUser.fcmToken,
      };
      try {
        await getMessaging().send(messagePayload);
      } catch (error) {
        console.error("Creator notification failed:", error.message);
      }
    }


    try {
      const allUsers = await User.find({
        fcmToken: { $exists: true, $ne: null },
      });
      const tokens = allUsers.map((user) => user.fcmToken).filter(Boolean);
      const tokenChunks = chunkArray(tokens, 500);

      for (const chunk of tokenChunks) {
        await getMessaging().sendMulticast({
          notification: {
            title: "New Event Available",
            body: `A new event "${
              eventData.venueDetails?.[0]?.eventName || "Exciting Event"
            }" has just been posted!`,
          },
          tokens: chunk,
        });
      }
    } catch (error) {
      console.error("Broadcast notification failed:", error.message);
    }

    res.status(200).json({
      status: true,
      event: newEvent,
    });
  } catch (error) {
    console.error("createEvent error:", error.message);
    res.status(500).json({ error: error.message, status: false });
  }
};

export const getEvenVenueAanalytics = async (req, res) => {
  try {
    const { id } = req.body;
    const events = await Events.find({ _id: id });
    if (events.length === 0) {
      return res
        .status(404)
        .json({ status: false, error: "No events found for this user" });
    }
    const responseData = events.map((event) => ({
      eventImages: event.eventImages,
      venueDetails: event.venueDetails,
    }));
    res.status(200).json({
      status: true,
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const id = req.userAddress;
    const myTickets = await Orders.find({ userId: id }).sort({_id:-1});
    const updatedTickets = myTickets.reduce((acc, ticket) => {
      const eventDateTime = new Date(`${ticket.venueDate} ${ticket.venuetime}`);
      ticket.status = new Date() > eventDateTime ? "completed" : "pending";
      acc.push(ticket);
      return acc;
    }, []);
    res
      .status(201)
      .json({ message: "Order created successfully", data: updatedTickets });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getSingleTickets = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ message: "Please provide ticket id" });
    }
    const myTicket = await Orders.findOne({ _id: id });
    res
      .status(201)
      .json({ message: "Order created successfully", data: myTicket });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const userContactUs = async (req, res) => {
  try {
    const val = req.body;
    const id = req.userAddress;
    if (!val) {
      return res.status(400).json({ message: "Please fill the form" });
    } else {
      const currentUser = await User.findOne({ _id: id });
      if (currentUser.fcmToken && currentUser.notification === true) {
        const messagePayload = {
          notification: {
            title: "New Contact Form Submission",
            body: `${currentUser.name}, you have received a new message via the contact form.`,
          },
          token: currentUser.fcmToken,
        };
        try {
          await firebase.messaging().send(messagePayload);
        } catch (error) {}
      }
      const contact = await ContactUs.create(val);
      res.status(201).json({
        message: "Contact form submitted successfully",
        data: contact,
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFollowEvents = async (req, res) => {
  try {
    const { id } = req.body;
    const events = await Events.find({ createdBy: id });
    const currentDateTime = new Date();
    const isuserData = await User.findOne({ _id: id });
    const updatedEvents = events.map((event) => {
      if (Array.isArray(event.venueDetails)) {
        event.venueDetails = event.venueDetails.map((venue) => {
          let dateStr = venue.date;
          if (dateStr.includes("/")) {
            dateStr = dateStr.replace(/\//g, "-");
          }
          const eventDateTime = new Date(`${dateStr} ${venue.time}`);
          venue.type =
            eventDateTime > currentDateTime ? "upComing" : "pastEvent";
          return venue;
        });
      }
      return event;
    });
    return res
      .status(200)
      .json({ status: true, data: updatedEvents, user: isuserData });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};

export const addFollow = async (req, res) => {
  try {
    const currentUserId = req.userAddress;
    const { followUserId } = req.body;
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res
        .status(404)
        .json({ status: false, message: "Current user not found" });
    }
    const userToToggleFollow = await User.findById(followUserId);
    if (!userToToggleFollow) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    const isFollowing = currentUser.Following.some(
      (user) => user.email === userToToggleFollow.email
    );
    if (isFollowing) {
      currentUser.Following = currentUser.Following.filter(
        (user) => user.email !== userToToggleFollow.email
      );
      userToToggleFollow.Followers = userToToggleFollow.Followers.filter(
        (user) => user.email !== currentUser.email
      );
      await currentUser.save();
      await userToToggleFollow.save();
      if (currentUser.fcmToken && currentUser.notification === true) {
        const messagePayload = {
          notification: {
            title: "Unfollowed user successfully",
            body: `${currentUser.name}, you have received a new message via the Unfollowed.`,
          },
          token: currentUser.fcmToken,
        };
        try {
          await firebase.messaging().send(messagePayload);
        } catch (error) {}
      }
      return res.status(200).json({
        status: true,
        message: "Unfollowed user successfully",
        isFollowing: false,
        currentUser,
        userToToggleFollow,
      });
    } else {
      currentUser.Following.push({
        name: userToToggleFollow.name,
        email: userToToggleFollow.email,
        profileImage: userToToggleFollow.image,
        status: true,
      });
      userToToggleFollow.Followers.push({
        name: currentUser.name,
        email: currentUser.email,
        profileImage: currentUser.image,
        status: true,
      });
      await currentUser.save();
      await userToToggleFollow.save();
      if (currentUser.fcmToken && currentUser.notification === true) {
        const messagePayload = {
          notification: {
            title: "Followed user successfully",
            body: `${currentUser.name}, you have received a new message via the Followed.`,
          },
          token: currentUser.fcmToken,
        };
        try {
          await firebase.messaging().send(messagePayload);
        } catch (error) {}
      }
     
      if (userToToggleFollow.fcmToken) {
        const messagePayload = {
          notification: {
            title: "New Follower",
            body: `${currentUser.name} has followed you!`,
          },
          token: userToToggleFollow.fcmToken,
        };
        try {
          await firebase.messaging().send(messagePayload);
        } catch (error) {
        }
      }
      return res.status(200).json({
        status: true,
        message: "Followed user successfully",
        isFollowing: true,
        currentUser,
        userToToggleFollow,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getFollowLists = async (req, res) => {
  try {
    const { id } = req.body;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    return res.status(200).json({
      status: true,
      message: "Follow lists retrieved successfully",
      following: user.Following,
      followers: user.Followers,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getAllEventz = async (req, res) => {
  try {
    const { cat, search } = req.query;

    let filter = { status: "completed" };

    if (cat) {
      const categories = cat.split(",").map((c) => c.trim());
      filter.category = { $in: categories };
    }

    let events = await Events.find(filter);

    if (!events || events.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "No approved events found" });
    }

    if (search) {
      const regex = new RegExp(search, "i");
      events = events.filter((event) =>
        event.venueDetails.some(
          (venue) => regex.test(venue.eventName) || regex.test(venue.venueName)
        )
      );
    }

    return res.status(200).json({
      status: true,
      message: "All venue details retrieved successfully",
      venueDetails: events,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Error fetching events",
      error: error.message,
    });
  }
};

export const addBankDetails = async (req, res) => {
  try {
    const val = req.body;
    const id = req.userAddress;

    const user = await User.findOne({ _id: id });

    val.userID = id;
    val.userEmail = user.email;
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    if (!val) {
      return res.status(400).json({ message: "Please fill the form" });
    } else {
      const bank = await bankDetails.create(val);

      if (user.fcmToken && user.notification === true) {
        const messagePayload = {
          notification: {
            title: "Bank details submitted successfully",
            body: `${user.name}, you have received a new message via the Bank details.`,
          },
          token: user.fcmToken,
        };
        try {
          await firebase.messaging().send(messagePayload);
        } catch (error) {}
      }

      res
        .status(201)
        .json({ message: "Bank details submitted successfully", data: bank });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server  error",
      error: error.message,
    });
  }
};

export const getBankDetails = async (req, res) => {
  try {
    const id = req.userAddress;
    const bank = await bankDetails.findOne({ _id: id });
    if (!bank) {
      return res
        .status(404)
        .json({ status: false, message: "Bank details not found" });
    } else {
      return res.status(200).json({
        status: true,
        message: "Bank details retrieved successfully",
        data: bank,
      });
    }  
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server  error",
      error: error.message,
    });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const id = req.userAddress;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    } else {
      await User.deleteOne({ _id: id });
      return res
        .status(200)
        .json({ status: true, message: "Account deleted successfully" });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server  error",
      error: error.message,
    });
  }
};

export const addRating = async (req, res) => {
  try {
    const userID = req.userAddress;
    const { eventId, venueId, ratings, comment } = req.body;
    if (!userID) {
      return res.status(404).json({ status: false, message: "User Not Found" });
    }
    if (
      !eventId ||
      !venueId ||
      ratings === undefined ||
      comment === undefined
    ) {
      return res.status(400).json({ status: false, message: "Enter All Data" });
    }
    const isUser = await User.findById(userID);
    if (!isUser) {
      return res.status(404).json({ status: false, message: "User Not Found" });
    }
    const newRating = {
      name: isUser.name,
      email: isUser.email,
      userID: userID,
      image: isUser.image,
      ratings,
      eventId,
      venueId,
      comment,
    };
    await rating.create(newRating);
    const updateEvent = await Events.updateOne(
      { _id: eventId, "venueDetails._id": venueId },
      { $push: { "venueDetails.$.eventRating": newRating } }
    );
    if (updateEvent.modifiedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Venue not found or rating not added",
      });
    }
    return res
      .status(200)
      .json({ status: true, message: "Rating added successfully" });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const id = req.userAddress;
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both old and new passwords are required" });
    }
    if (oldPassword == newPassword) {
      return res
        .status(400)
        .json({ message: "Both old and new passwords not be same" });
    }
    const user = await User.findOne({
      _id: id,
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid email/phone" });
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Incorrect old password" });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { password: hashedNewPassword });
    if (user.fcmToken && user.notification === true) {
      const messagePayload = {
        notification: {
          title: "Password changed successfully",
          body: `${user.name}, you have received a new message via the change Password.`,
        },
        token: user.fcmToken,
      };
      try {
        await firebase.messaging().send(messagePayload);
      } catch (error) {}
    }
    res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getRatings = async (req, res) => {
  try {
    const { id } = req.body;
    const ratings = await rating.find({ userID: id });
    if (!ratings || ratings.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "No ratings found" });
    } else {
      return res.status(200).json({
        status: true,
        message: "Ratings retrieved successfully",
        data: ratings,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const addFav = async (req, res) => {
  try {
    const userId = req.userAddress;
    const { eventId, venueId } = req.body;
    const userdata = await User.findOne({ _id: userId });
    if (!eventId || !venueId) {
      return res
        .status(400)
        .json({ status: false, message: "Event ID and Venue ID are required" });
    }
    const event = await Events.findOne({ _id: eventId });
    if (!event) {
      return res
        .status(404)
        .json({ status: false, message: "Event not found" });
    }
    const venue = event.venueDetails.find((v) => v._id.toString() === venueId);
    if (!venue) {
      return res
        .status(404)
        .json({ status: false, message: "Venue not found" });
    }
    const favoriteIndex = venue.Favorites.findIndex(
      (fav) => fav.userID === userId
    );
    if (favoriteIndex !== -1) {
      venue.Favorites[favoriteIndex].status =
        !venue.Favorites[favoriteIndex].status;
      if (!venue.Favorites[favoriteIndex].status) {
        venue.Favorites.splice(favoriteIndex, 1);
      }
    } else {
      venue.Favorites.push({ userID: userId, status: true });
    }
    await event.save();
    if (userdata.fcmToken && userdata.notification===true) {
      const messagePayload = {
        notification: {
          title: "Added to Favorites",
          body: `${userdata.name},  you have successfully added your favorites.`,
        },
        token: userdata.fcmToken,
      };
      try {
        await firebase.messaging().send(messagePayload);
      } catch (error) {
        console.error("❌ Error sending push notification:", error);
      }
    }
    return res.status(200).json({
      status: true,
      message: "Favorites updated successfully",
      Favorites: venue.Favorites,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getMyFavorites = async (req, res) => {
  try {
    const userId = req.userAddress;
    const { cat, search } = req.query;
    if (!userId) {
      return res
        .status(400)
        .json({ status: false, message: "User ID is required" });
    }
    let filter = {
      "venueDetails.Favorites.userID": userId,
      "venueDetails.Favorites.status": true,
    };
    if (cat) {
      const categories = cat.split(",").map((c) => c.trim());
      filter.category = { $in: categories };
    }
    let events = await Events.find(filter);
    if (!events || events.length === 0) {
      return res
        .status(404)
        .json({ status: false, message: "No favorite events found" });
    }
    const uniqueUserIds = [...new Set(events.map((event) => event.createdBy))];
    const usersData = await User.find({ _id: { $in: uniqueUserIds } }).lean();
    const userMap = usersData.reduce((acc, user) => {
      acc[user._id] = user;
      return acc;
    }, {});
    events = events.map((event) => {
      const favoriteVenues = event.venueDetails.filter((venue) =>
        venue.Favorites.some(
          (fav) => fav.userID === userId && fav.status === true
        )
      );
      return {
        _id: event._id,
        organizationName: event.organizationName,
        category: event.category,
        eventImages: event.eventImages,
        venueDetails: favoriteVenues,
        createdBy: userMap[event.createdBy] || null,
      };
    });
    return res.status(200).json({
      status: true,
      message: "Favorites fetched successfully",
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const sendchat = async (req, res) => {
  try {
    const { receiverId, message, eventId } = req.body;
    const senderId = req.userAddress;
    if (!receiverId || !message || !eventId || !senderId) {
      return res.status(400).json({
        error: "Sender ID, Receiver ID, Event ID, and message are required.",
      });
    }
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    let finalReceiverId = receiverId;
    const roomId = `12345_${eventId}`;
    const newMessage = {
      senderId,
      receiverId: receiverId,
      message,
      timestamp: new Date(),
      roomId,
    };
    event.chats.push(newMessage);
    await event.save();
    const io = req.app.get("io");
    io.to(roomId).emit("newMessage", newMessage);
    console.log(`📩 Message sent to Room postapi: ${roomId}`, newMessage);
    return res.status(201).json({ success: true, newMessage });
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getUsersWhoMessaged = async (req, res) => {
  try {
    const senderId = "6801ec55f403fd05394fe9f0"; 
    const eventz = await Events.find({ createdBy: senderId });
   

    if (!eventz || eventz.length === 0) {
      return res.status(404).json({ error: "No events found." });
    }

    const userRoomMap = new Map();

    eventz.forEach((event) => {
      if (event.chats && event.chats.length > 0) {
        event.chats.forEach((chat) => {
          if (chat.receiverId.toString() === receiverId) {
            const chatSenderId = chat.senderId.toString();
            if (chatSenderId !== receiverId && !userRoomMap.has(chatSenderId)) {
              userRoomMap.set(chatSenderId, chat.roomId);
            }
          }
        });
      }
    });

    const userIds = [...userRoomMap.keys()];
    if (userIds.length === 0) {
      return res.status(200).json({ success: true, users: [] });
    }

    const usersDetails = await User.find(
      { _id: { $in: userIds } },
      { _id: 1, name: 1, image: 1 }
    );

    const usersWithRooms = usersDetails.map((user) => ({
      userId: user._id,
      name: user.name,
      image: user.image || "",
      roomId: userRoomMap.get(user._id.toString()),
    }));

    return res.status(200).json({ success: true, users: usersWithRooms });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getchat = async (req, res) => {
  try {
    const { eventId, receiverId } = req.query;
    const senderId = req.userAddress;
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required." });
    }
    const event = await Events.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found." });
    }
    let chats;
    if (receiverId) {
      const roomId = `12345_${eventId}`;
      chats = event.chats.filter((chat) => chat.roomId === roomId);
    } else {
      chats = event.chats.filter((chat) => chat.roomId === `event_${eventId}`);
    }
    res.status(200).json({ success: true, chats });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getPlatformFee = async (req, res) => {
  try {
    const platformfee = await platformFee.findOne({
      _id: "68304dbc0a656a74ff3b669c",
    });
    if (platformfee) {
      res.status(201).json({
        status: true,
        message: "Get Platform fee successfully",
        data: platformfee,
      });
    } else {
      res.status(404).json({ status: false, message: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getNotification = async (req, res) => {
  const id = req.userAddress;
  try {
    const platformfee = await Notification.find({ userId: id }).sort({
      _id: -1,
    });
    console.log("platformfee", platformfee);

    if (platformfee) {
      res.status(201).json({
        status: true,
        message: "Get Notification fee successfully",
        data: platformfee,
      });

  
    } else {
      res.status(404).json({ status: false, message: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getchatLists = async (req, res) => {
  try {
    const userId = req.userAddress;
    console.log("Logged-in userId:", userId);

  
    const events = await Events.find({
      $or: [
        { "chats.sender": userId },
        { createdBy: userId }
      ]
    }).lean();

    const eventChatMap = new Map();

    for (const event of events) {
      if (!event.chats || event.chats.length === 0) continue;

  
      const latestChat = event.chats.reduce((prev, curr) => {
        return new Date(curr.timestamp) > new Date(prev.timestamp) ? curr : prev;
      });

      const senderId = latestChat.sender?.toString?.() || latestChat.sender;
      const sender = await User.findById(senderId).lean();
      if (!sender) continue;

      eventChatMap.set(event._id.toString(), {
        eventId: event._id,
        eventName: event.venueDetails?.[0]?.eventName || "Unnamed Event",
        createdBy: event.createdBy,
        userId: senderId,
        userName: sender.name,
        userImage: sender.image,
        lastMessage: latestChat.message,
        timestamp: latestChat.timestamp,
        roomId: `${event._id}_${senderId}`
      });
    }

    const chatList = Array.from(eventChatMap.values());

   
    return res.json({ success: true, chatList });

  } catch (err) {
    console.error("Error fetching chat list:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getSingleUser = async (req, res) => {

  const { userId, otherUserId, eventId } = req.body;
 

  if (!userId || !otherUserId || !eventId) {
    return res.status(400).json({
      success: false,
      message: "userId, otherUserId, and eventId are required",
    });
  }

  try {
    const event = await events.findById(eventId);
 

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const roomId = `12345_${eventId}`; 
   

   
    const filteredMessages = event.chats.filter(
      (chat) =>
        chat.roomId === roomId &&
        ((chat.senderId.toString() === userId &&
          chat.receiverId.toString() === otherUserId) ||
          (chat.senderId.toString() === otherUserId &&
            chat.receiverId.toString() === userId))
    );

    return res.json({
      success: true,
      messages: filteredMessages,
    });
  } catch (err) {
    console.error("❌ Error getting messages:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getEventChatByUser = async (req, res) => {
  try {
    const { eventId, page = 1, limit = 20 } = req.body; 
    const skip = (page - 1) * limit;

    const event = await Events.findById(eventId)
      .populate("chats.sender", "name email image")
      .lean();

    if (!event) {
      return res
        .status(404)
        .json({ status: false, message: "Event not found" });
    }

    const sortedChats = (event.chats || []).sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    const paginatedChats = sortedChats.slice(skip, skip + Number(limit));

    res.status(200).json({
      status: true,
      currentPage: Number(page),
      totalPages: Math.ceil(sortedChats.length / limit),
      totalMessages: sortedChats.length,
      chats: paginatedChats,
      eventDetails: {
        eventId: event._id,
        title: event.title,
      },
    });
  } catch (err) {
    console.error("Error fetching event chats:", err.message);
    res.status(500).json({
      status: false,
      message: "Error Occurred!",
      error: err.message,
    });
  }
};

export const notificationSettings = async (req, res) => {
  try {
    const { notification } = req.body;
   
    const id = req.userAddress;
    const userDate = await User.findOneAndUpdate({ _id: id }, { notification: notification }, { new: true });

    if (!userDate) {
      return res.status(404).json({ status: false, message: "User not found" });
    }
    else {
      return res.status(200).json({
        status: true,
        message: "Notification settings updated successfully",
        data: userDate,
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    })
  }
}


// export const verifyTicket = async (req, res) => {
//   try {
//     const { bookinId,usedTicket } = req.body;

//     const ticket = await Orders.findOne({ bookinId: bookinId });


//     if (!ticket) {
//       return res.status(404).json({ message: "Ticket not found", status: false });
//     }

//     const eventDateTime = new Date(`${ticket.venueDate} ${ticket.venuetime}`);
//     const currentDateTime = new Date();

//     if (currentDateTime > eventDateTime) {
//       return res.status(400).json({ message: "Cannot verify a past event ticket", status: false });
//     }

//     if (ticket.verifyTicket) {
//       return res.status(200).json({ message: "Ticket already verified", status: false });
//     }

//     const updatedTicket = await Orders.findOneAndUpdate(
//       { bookinId: bookinId },                                                                                          
//       { $set: { verifyTicket: true } },
//       { new: true }
//     );

//     return res.status(200).json({
//       message: "Ticket verified successfully",
//       status: true,
//       data: updatedTicket
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error", status: false });
//   }
// };

 
export const verifyTicket = async (req, res) => {
  try {
    const { bookinId } = req.body;
    const ticket = await Orders.findOne({ bookinId });

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found", status: false });
    }

    const eventDateTime = new Date(`${ticket.venueDate} ${ticket.venuetime}`);
    const currentDateTime = new Date();

    if (currentDateTime > eventDateTime) {
      return res.status(400).json({ message: "Cannot verify a past event ticket", status: false });
    }

    const allowedScans = parseInt(ticket.ticket_count) || 1;
    const usedCount = ticket.usedCount || 0;

    if (usedCount >= allowedScans) {
      return res.status(200).json({ message: "Ticket fully used", status: false });
    }

    const updatedTicket = await Orders.findOneAndUpdate(
      { bookinId },
      {
        $set: { verifyTicket: true },
        $inc: { usedCount: 1 }
      },
      { new: true }
    );

    const remainingScans = allowedScans - updatedTicket.usedCount;

    return res.status(200).json({
      message: remainingScans === 0 ? "Final scan successful, ticket fully used" : "Ticket scan successful",
      status: true,
      data: updatedTicket,
      remainingScans
    });
  } catch (error) {
    console.error("Ticket verification error:", error);
    res.status(500).json({ message: "Internal server error", status: false });
  }
};

export const loginScannerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
console.log("Login request body:", req.body);
    // Find user by email
    const user = await ScannerUser.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(400).json({ status: false, message: "Invalid email or password" });
    }

    // Set isLogin to true
    user.isLogin = true;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isLogin: user.isLogin,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const ContactUsForm =async (req, res) => {
  try {
       const val = req.body;
    if (!val) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }
    const contact = await webContactUs.create(val);
     if (contact) {
      return res.status(200).json({ status: true, message: "Form sumbited successfully" });
     }else {
      return res.status(400).json({ status: false, message: "Form submission failed" });
     }
  } catch (error) {
     console.error("Error in frontendContactForm:", error);
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}
