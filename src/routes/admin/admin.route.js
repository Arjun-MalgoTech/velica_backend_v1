import express from "express";
import {
  adminHistoryss,
  areaOfInterest,
  createOffer,

  deleteAreaOfInterest,
  deleteOffer,
  deleteScannerUser,
  eventStatus,
  forgotPassword,
  getAllEvents,
  getAllUser,
  getAreasOfInterest,
  getAreasOfInterestById,
  getDashCount,
  getEventById,
  getOfferById,
  getOffers,
  getPaymentHistory,
  getPlatformFee,
  getRegisterScannerUser,
  getSinglePaymentHistory,
  getSinglePlatformFee,
  getSingleTicket,
  getTicket,
  getUserById,
  getVenueTickets,
  registerScannerUser,
  resetPassword,
  signinAdmin,
  singleAdminHistoryss,
  updateAreaOfInterest,
  updateEvent,
  updateEventTicket,
  updateOffer,
  updatePlatformFee,
  verifyResetOTP,
} from "../../controllers/admin/admin.controller.js";
import { checkTransactionStatus } from "../../controllers/user/user.controller.js";

const router = express.Router();

router.post("/login", signinAdmin);
router.post("/forgotpassword", forgotPassword)
router.post("/verifyresetotp", verifyResetOTP)
router.post("/resetpassword", resetPassword)
router.get("/getusers", getAllUser);
router.get("/getuser/:userid", getUserById);
router.get("/getevents", getAllEvents);
router.get("/getevent/:eventId", getEventById);
router.post("/eventstatus", eventStatus)
router.post("/areaofinterest", areaOfInterest);
router.get("/getareaofinterest", getAreasOfInterest);
router.get("/getareaofinterest/:id", getAreasOfInterestById);
router.post("/updateareaofinterest/:id", updateAreaOfInterest);
router.post("/deleteinterests", deleteAreaOfInterest);
router.post("/events", getVenueTickets);
router.post("/events/updateticket", updateEventTicket);
router.post("/offers", createOffer);
router.get("/getoffers", getOffers);
router.post("/getofferbyid", getOfferById);
router.post("/updateoffer", updateOffer);
router.post("/deleteoffer", deleteOffer);
router.get("/getTicket", getTicket)
router.post('/getSingleTicket', getSingleTicket)
router.post('/updateEvent', updateEvent)
router.get('/getDashCount', getDashCount)
router.get('/adminHistory', adminHistoryss)
router.post('/singleAdminHistoryss', singleAdminHistoryss)

router.post('/updatePlatformFee',updatePlatformFee)

router.get('/getPlatformFee',getPlatformFee)
router.post('/getSinglePlatformFee',getSinglePlatformFee)

router.get('/getPaymentHistory',getPaymentHistory)
router.post('/getSinglePaymentHistory',getSinglePaymentHistory)
router.post('/checkTransactionStatus',checkTransactionStatus)
router.post('/registerScannerUser',registerScannerUser)
router.get('/getRegisterScannerUser',getRegisterScannerUser)
router.post('/deleteScannerUser', deleteScannerUser)
export default router;


