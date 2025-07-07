import express from "express";
import {
  signinUser,
  sendOTP,
  signupUser,
  verifyOTP,
  forgotPassword,
  resetPassword,
  verifyResetOTP,
  updateProfile,
  areaOfInterest,
  getAreasOfInterest,
  updateAreaOfInterest,
  getAllEvents,
  getEventById,
  getSignedInUser,
  addAreaOfInterest,
  getProfile,
  getVenueTickets,
  getUserEvents,
  getOffers,
  buyticket,
  myEventDashboard,
  createEvent,
  getEvenVenueAanalytics,
  getMyTickets,
  getSingleTickets,
  userContactUs,
  getFollowEvents,
  addFollow,
  getFollowLists,
  getAllEventz,
  addBankDetails,
  deleteAccount,
  addRating,
  changePassword,
  getRatings,
  addFav,
  getMyFavorites,
  getBankDetails,
  resendOTP,
  sendchat,
  getchat,
  getUsersWhoMessaged,
  getPaymentToken,
  cashIn,
  merchantPayment,
  oAuth,
  checkTransactionStatus,
  getPlatformFee,
  getNotification,
  getchatLists,
  getSingleUser,
  getEventChatByUser,
  notificationSettings,
  verifyTicket,
  loginScannerUser,
  ContactUsForm,
} from "../../controllers/user/user.controller.js";
import { verifyUserAuthToken } from "../../services/helper.js";

const router = express.Router();
router.post("/auth/signup", signupUser);
router.post("/auth/send-otp", sendOTP);
router.post("/auth/verify-otp", verifyOTP);
router.post("/auth/verify-reset-otp", verifyResetOTP);
router.post("/auth/signin", signinUser);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password", resetPassword);
router.post("/auth/resend-otp", resendOTP);
router.post("/auth/oAuth", oAuth);
router.get("/auth/user/profile", verifyUserAuthToken, getSignedInUser);
router.get("/auth/getprofile", verifyUserAuthToken, getProfile);
router.post("/auth/updateProfile", verifyUserAuthToken, updateProfile);
router.post("/auth/areaofinterest", verifyUserAuthToken, areaOfInterest);
router.post("/auth/addinterest", verifyUserAuthToken, addAreaOfInterest);
router.get("/auth/interests", verifyUserAuthToken, getAreasOfInterest);
router.put("/auth/interests/update/:id", updateAreaOfInterest);
router.get("/auth/getuserevent", verifyUserAuthToken, getUserEvents);
router.get("/auth/events", getAllEvents);
router.get("/auth/events/:eventId", verifyUserAuthToken, getEventById);
router.get(
  "/auth/getvenueticket/:eventId/:venueId",
  verifyUserAuthToken,
  getVenueTickets
);
router.get("/auth/getoffer", verifyUserAuthToken, getOffers);

router.post("/auth/buytickets", verifyUserAuthToken, buyticket);

router.get("/auth/myEventDashboard", verifyUserAuthToken, myEventDashboard);
router.post("/auth/createEvent", verifyUserAuthToken, createEvent);
router.post(
  "/auth/getEvenVenueAanalytics",
  verifyUserAuthToken,
  getEvenVenueAanalytics
);
router.get("/auth/getMyTickets", verifyUserAuthToken, getMyTickets);
router.post("/auth/getSingleTickets", verifyUserAuthToken, getSingleTickets);
router.post("/auth/userContactUs", verifyUserAuthToken, userContactUs);
router.post("/auth/getFollowEvents", verifyUserAuthToken, getFollowEvents);
router.post("/auth/addFollow", verifyUserAuthToken, addFollow);
router.post("/auth/getFollowLists", verifyUserAuthToken, getFollowLists);
router.get("/auth/getBankDetails", verifyUserAuthToken, getBankDetails);
router.get("/auth/getAllEventz", verifyUserAuthToken, getAllEventz);
router.post("/auth/addBankDetails", verifyUserAuthToken, addBankDetails);
router.get("/auth/deleteAccount", verifyUserAuthToken, deleteAccount);
router.post("/auth/addRating", verifyUserAuthToken, addRating);
router.post("/auth/changePassword", verifyUserAuthToken, changePassword);
router.post("/auth/getRatings", verifyUserAuthToken, getRatings);
router.post("/auth/addFav", verifyUserAuthToken, addFav);
router.get("/auth/getMyFavorites", verifyUserAuthToken, getMyFavorites);
router.post("/auth/sendchat", verifyUserAuthToken, sendchat);
router.get("/auth/getchat", verifyUserAuthToken, getchat);
router.get("/auth/getUsersWhoMessagedOrganizer", getUsersWhoMessaged);
router.get("/getPaymentToken", getPaymentToken);
router.post("/cashIn", cashIn);
router.post("/merchantPayment", merchantPayment);
router.post("/checkTransactionStatus", checkTransactionStatus);

router.get("/getPlatformFee", getPlatformFee);
router.get("/getNotification", verifyUserAuthToken, getNotification);
router.get("/auth/getchatLists", verifyUserAuthToken, getchatLists);
router.post("/auth/getSingleChat", verifyUserAuthToken, getSingleUser);
router.post("/auth/getchats", verifyUserAuthToken, getEventChatByUser);
router.post("/auth/notificationSettings", verifyUserAuthToken, notificationSettings);
router.post('/verifyTicket',verifyTicket);
router.post('/loginScannerUser',loginScannerUser);
router.post('/ContactUsForm',ContactUsForm)
export default router;
