import User from "../../models/user.js";
import Admin from "../../models/admin.js";
import Offer from "../../models/offers.js";
import Interest from "../../models/areaOfInterest.js";
import Events from "../../models/events.js";
import uploadFile, { multipleImageUpload } from "../../config/s3.js";
import { generateJWT, verifyJWT, generateOTP } from "../../services/helper.js";
import { sendMail, sendSMS } from "../../services/smtp.js";
import bcrypt from "bcryptjs";
import emailTemplate from "../../models/emailTemp.js";
import { getIPAddress, getLocation, getPublicIP } from "../../services/common.js";
import adminHistory from "../../models/adminHistory.js";
import { UAParser } from "ua-parser-js";
import orderDetails from "../../models/orderDetails.js";
import platformFee from "../../models/platformFee.js";
import depositHistory from "../../models/depositHistory.js";
import ScannerUser from "../../models/scannerLogin.js";
export const signinAdmin = async (req, res) => {
  const { email, password } = req.body;
  console.log(" req.body",  req.body);
  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password is required" });
  }
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: "Invalid email" });
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
     console.log("isPasswordValid",isPasswordValid)
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Incorrect password" });
    }
    const token = generateJWT({ id: admin._id });
    if (!token) {
      return res.status(400).json({ message: "Not get Token" });
    } else {
      let ipAddress = await getIPAddress(req)
      ipAddress = await getPublicIP();
      let geo = await getLocation(ipAddress);
      const parser = new UAParser();
      parser.setUA(req.headers['user-agent']);
      const result = parser.getResult();
      let obj = {
        email: email,
        browser_name: result.browser.name || "Unknown",
        ip_address: ipAddress,
        os: result.os.name ? `${result.os.name} ${result.os.version}` : "Unknown",
        device: result.device.type || "Desktop",
        country: geo.country,
        region: geo.region,
        city: geo.city,
        regionName: geo.regionName,
      }
      await adminHistory.create(obj)
      return res.json({ status: true, message: "Login successful", token });
    }
  } catch (error) {
    return res.json({ status: false, message: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res.json({ status: false, message: "Email  is required" });
  try {
    let user = await Admin.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "Admin data not found" });
    }
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();
    const isEmail = email.indexOf("@") > 0;
    if (isEmail) {
      let otpres = await sendMail({
        to: email,
        subject: "Reset Password OTP | Velica",
        text: `Your Velica Reset Password OTP is ${otp}.\n\nNote: This OTP is valid for 5 minutes. Please use it promptly!`,
      });
    }
    const token = generateJWT({ id: user._id });
    res.status(200).json({ status: true, message: "OTP sent successfully", token });
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;
  if (!email) {
    return res.status(400).json({ status: false, message: "Email or Phone is required" });
  }
  if (!otp) {
    return res.status(400).json({ status: false, message: "OTP is required" });
  }
  try {
    let user = await Admin.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ status: false, message: "admin not found" });
    }
    if (!user || user.otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
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
    res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    if (!token) {
      return res.status(400).json({ status: false, message: "Reset token is required" });
    }
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.id) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid or expired token" });
    }
    const adminid = decoded.id;
    let user = await Admin.findById(adminid);
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "admin not found" });
    }
    if (token !== user.resetToken) {
      return res.status(400).json({ status: false, message: "Invalid reset token" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ status: false, message: "Passwords do not match" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = newPassword;
    user.password = hashedPassword;
    user.resetToken = null;
    await user.save();
    res.json({ status: true, message: "Password reset successful" });
  } catch (error) {
    res
      .status(500)
      .json({ status: false, message: "Failed to reset password", error: error.message });
  }
};

export const getAllUser = async (req, res) => {
  try {
    const events = await User.find();
    if (events.length === 0) {
      return res.status(404).json({ status: false, message: "No user found" });
    }
    res.status(200).json({
      status: true,
      message: "User Information retrieved successfully",
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userid } = req.params;
    const events = await User.findById(userid);
    if (events.length === 0) {
      return res.status(404).json({ status: false, message: "No user found" });
    }
    res.status(200).json({
      status: true,
      message: "User Information retrieved successfully",
      data: events,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

export const getAllEvents = async (req, res) => {
  try {
    const events = await Events.find();

    if (events.length === 0) {
      return res.status(404).json({ message: "No events found" });
    }

    res.status(200).json({
      status: true,
      message: "Events retrieved successfully",
      data: events,
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

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({
      status: true,
      message: "Event retrieved successfully",
      data: event,
    });
  } catch (error) {
    res.json({
      status: false,
      message: "Error fetching event",
      error: error.message,
    });
  }
};

export const eventStatus = async (req, res) => {
  try {
    const { eventid, type } = req.body;

    if (!eventid || !type) {
      return res
        .status(400)
        .json({ message: "Event ID and type are required" });
    }

    if (!["approve", "reject"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Invalid type, must be 'approve' or 'reject'" });
    }

    const updatedEvent = await Events.findByIdAndUpdate(
      eventid,
      { status: type },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res
      .status(200)
      .json({ status: true, message: `Event ${type}d successfully`, event: updatedEvent });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const areaOfInterest = async (req, res) => {
  try {
    const { name } = req.body;

    let interestImage = "";

    if (req.files && req.files.image) {
      const image = req.files.image;
      interestImage = await uploadFile(image.name, image.data, image.mimetype);
    }


    const interest = await Interest.create({
      name,
      image: interestImage,
    });

    res.json({
      status: true,
      message: "Interest created successfully",
      data: interest,
    });
  } catch (error) {
    res.json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getAreasOfInterest = async (req, res) => {
  try {

    const interests = await Interest.find({}, "name image");

    res.json({
      message: "Interests retrieved successfully",
      status: true,
      data: interests,
    });
  } catch (error) {
    res.json({
      message: "Internal server error",
      status: false,
      error: error.message,
    });
  }
};

export const getAreasOfInterestById = async (req, res) => {
  try {
    const { id } = req.params;


    const interest = await Interest.findById(id).select("name image");


    if (!interest) {
      return res
        .status(404)
        .json({ status: false, message: "Interest not found" });
    }

    res.json({
      message: "Interest retrieved successfully",
      status: true,
      data: interest,
    });
  } catch (error) {
    res.json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateAreaOfInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    let updatedFields = {};


    if (name) {
      updatedFields.name = name;
    }


    if (req.files && req.files.image) {
      const image = req.files.image;
      const profileImage = await uploadFile(
        image.name,
        image.data,
        image.mimetype
      );
      updatedFields.image = profileImage;
    }


    const updatedInterest = await Interest.findByIdAndUpdate(id, {
      $set: updatedFields,
    });
    const updated = await Interest.findById(id);

    if (!updatedInterest) {
      return res
        .status(404)
        .json({ status: false, message: "Interest not found" });
    }

    res.json({
      status: true,
      message: "Interest updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const deleteAreaOfInterest = async (req, res) => {
  try {
    const { id } = req.body;

    const interest = await Interest.findById(id);
    if (!interest) {
      return res.status(404).json({ message: "Interest not found" });
    }


    await Interest.findByIdAndDelete(id);

    res.json({
      status: true,
      message: "Interest deleted successfully",
    });
  } catch (error) {
    res.json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



export const getVenueTickets = async (req, res) => {
  try {
    const { eventId, venueId } = req.body;
    const event = await Events.findOne(
      { _id: eventId, "venueDetails._id": venueId },
      { "venueDetails.$": 1, eventName: 1 }
    );
    if (!event || !event.venueDetails || event.venueDetails.length === 0) {
      return res.status(404).json({ status: false, message: "Event or Venue not found" });
    }
    const venue = event.venueDetails[0];
    res.status(200).json({
      status: true,
      message: "Venue details and tickets retrieved successfully",
      eventName: event.eventName,
      venueDetails: {
        eventName: venue.eventName,
        venueName: venue.venueName,
        address: venue.address,
        date: venue.date,
        time: venue.time,
        location: venue.location,
        status: venue.status,
        type: venue.type,
        lat: venue.lat,
        lng: venue.lng,
      },
      tickets: venue.ticket,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: "Error fetching venue details and tickets",
      error: error.message,
    });
  }
};



export const updateEventTicket = async (req, res) => {
  try {
    const { eventId, venueId } = req.body;
    const { team, price, ticketno } = req.body;

    if (!team || !price || !ticketno) {
      return res.status(400).json({ message: "Missing ticket details" });
    }

    const updatedEvent = await Events.findOneAndUpdate(
      { _id: eventId, "venueDetails._id": venueId },
      {
        $push: {
          "venueDetails.$.ticket": { team, price, ticketno },
        },
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: "Event or Venue not found" });
    }

    res
      .status(200)
      .json({ message: "Ticket added successfully", event: updatedEvent });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating ticket", error: error.message });
  }
};

export const createOffer = async (req, res) => {
  try {
    const { code, description } = req.body;
    let imageUrl = "";


    if (req.files && req.files.image) {
      const image = req.files.image;
      imageUrl = await uploadFile(image.name, image.data, image.mimetype);
    }


    const newOffer = Offer.create({
      image: imageUrl,
      code,
      description,
    });
    res
      .status(201)
      .json({ message: "Offer created successfully", status: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

export const getOfferById = async (req, res) => {
  try {
    const { id } = req.body;
    const offer = await Offer.findById(id);
    if (!offer) {
      return res
        .status(404)
        .json({ message: "Offer not found", status: false });
    }
    res.status(200).json({ status: true, offer });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { offerid, code, description } = req.body;
    let updateData = { code, description };


    if (req.files && req.files.image) {
      const image = req.files.image;


      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedMimeTypes.includes(image.mimetype)) {
        return res
          .status(400)
          .json({ message: "Invalid image format", status: false });
      }

      updateData.image = await uploadFile(
        image.name,
        image.data,
        image.mimetype
      );
    }

    const updatedOffer = await Offer.findByIdAndUpdate(offerid, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedOffer) {
      return res
        .status(404)
        .json({ message: "Offer not found", status: false });
    }

    res.status(200).json({
      message: "Offer updated successfully",
      status: true,
      data: updatedOffer,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.body;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) {
      return res
        .status(404)
        .json({ message: "Offer not found", status: false });
    }
    res
      .status(200)
      .json({ message: "Offer deleted successfully", status: true });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};


export const adminHistoryss = async (req, res) => {
  try {
    const data = await adminHistory.find({}).sort({ _id: -1 })
    if (!data) {

      res.json({
        status: false,
        message: "No data found",

      });
    } else {
      res.json({
        status: true,
        message: "Tickets retrieved successfully",
        data: data,
      });
    }
  } catch (error) {

  }
}

export const singleAdminHistoryss = async (req, res) => {
  try {
    const { id } = req.body;
    const data = await adminHistory.find({ _id: id })
    if (!data) {

      res.json({
        status: false,
        message: "No data found",

      });
    } else {
      res.json({
        status: true,
        message: "Tickets retrieved successfully",
        data: data,
      });
    }
  } catch (error) {

  }
}


export const getTicket = async (req, res) => {
  try {


    const myTickets = await orderDetails.find({});

    const updatedTickets = myTickets.reduce((acc, ticket) => {
      const eventDateTime = new Date(`${ticket.venueDate} ${ticket.venuetime}`);
      ticket.status = new Date() > eventDateTime ? 'completed' : 'pending';
      acc.push(ticket);
      return acc;
    }, []);

    res.status(201).json({ message: "Order created successfully", data: updatedTickets });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getSingleTicket = async (req, res) => {
  try {
    const { id } = req.body;

    const myTickets = await orderDetails.findOne({ _id: id });



    res.status(201).json({ message: "Order created successfully", data: myTickets });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
}


export const getDashCount = async (req, res) => {
  try {
    const user = await User.find({});
    const order = await orderDetails.find({});
    const event = await Events.find({});
    const transactionSumResult = await depositHistory.aggregate([
      {
        $group: {
          _id: null,
          totalTransactionAmount: {
            $sum: { $toDouble: "$transactionAmount" } 
          }
        }
      }
    ]);

    const totalTransactionAmount = transactionSumResult[0]?.totalTransactionAmount || 0;
    res.status(201).json({ status: true, message: "Order created successfully", data: { user: user, ticket: order, event: event,atm:totalTransactionAmount } });

  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}



export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.body;
    let eventData = { ...req.body };
    const imageFiles = req.files;
    const existingEvent = await Events.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ status: false, error: "Event not found" });
    }

    let uploadedEventImages = [...existingEvent.eventImages];
    let uploadedDocument = existingEvent.document;
    let uploadedBusinessDocument = existingEvent.businessDocument;

    if (imageFiles) {
      if (imageFiles.flyerimage) {
        const newImages = await multipleImageUpload(
          Array.isArray(imageFiles.flyerimage) ? imageFiles.flyerimage : [imageFiles.flyerimage]
        );
        uploadedEventImages = [...uploadedEventImages, ...newImages];
      }
      if (imageFiles.orgidDocument) {
        const newDocument = await multipleImageUpload([imageFiles.orgidDocument]);
        uploadedDocument = newDocument[0];
      }
      if (imageFiles.orgbussdocument) {
        const newBusinessDocument = await multipleImageUpload([imageFiles.orgbussdocument]);
        uploadedBusinessDocument = newBusinessDocument[0];
      }
    }

    let venueDetails = existingEvent.venueDetails || [];
    if (eventData.venueDetails) {
      try {
        venueDetails = JSON.parse(eventData.venueDetails);
      } catch (err) {
        return res.status(400).json({ status: false, error: "Invalid venueDetails format" });
      }
    }

    if (Array.isArray(venueDetails)) {
      venueDetails = venueDetails.map((venue, index) => ({
        eventName: eventData.eventname || existingEvent.eventname || "N/A",
        venueName: venue.venueName || existingEvent.venueDetails?.[index]?.venueName || "N/A",
        address: venue.address || existingEvent.venueDetails?.[index]?.address || "N/A",
        date: venue.date || existingEvent.venueDetails?.[index]?.date || "N/A",
        time: venue.time || existingEvent.venueDetails?.[index]?.time || "N/A",
        location: venue.location || existingEvent.venueDetails?.[index]?.location || "N/A",
        type: venue.type || existingEvent.venueDetails?.[index]?.type || "N/A",
        lng: venue.lng || existingEvent.venueDetails?.[index]?.lng || "0",
        lat: venue.lat || existingEvent.venueDetails?.[index]?.lat || "0",
        ticket: venue.ticket?.length ? venue.ticket : existingEvent.venueDetails?.[index]?.ticket || [],
        status: true,
      }));
    }

    const updatedEvent = await Events.findByIdAndUpdate(
      eventId,
      {
        organizationName: eventData.orgname || existingEvent.organizationName,
        category: eventData.orgcategory || existingEvent.category,
        contactPerson: eventData.orgpersonname || existingEvent.contactPerson,
        phoneNumber: eventData.orgphonenumber || existingEvent.phoneNumber,
        accountNumber: eventData.orgaccnumber || existingEvent.accountNumber,
        BBAN: eventData.orgbban || existingEvent.BBAN,
        eventImages: uploadedEventImages,
        document: uploadedDocument,
        businessDocument: uploadedBusinessDocument,
        duration: eventData.eventduration || existingEvent.duration,
        ageLimit: eventData.eventage || existingEvent.ageLimit,
        language: eventData.eventlang || existingEvent.language,
        aboutEvent: eventData.aboutEvent || existingEvent.aboutEvent,
        terms_Condition: eventData.terms_Condition || existingEvent.terms_Condition,
        venueDetails: venueDetails.length > 0 ? venueDetails : existingEvent.venueDetails,
      },
      { new: true }
    );


    res.status(200).json({ status: true, event: updatedEvent });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};







export const updatePlatformFee = async (req, res) => {
  try {
    const { id, platformfee } = req.body;

    const updatedFee = await platformFee.findByIdAndUpdate(
      id,
      { fee:platformfee },
      { new: true }
    );
    

    if (!updatedFee) {
      return res.status(404).json({status: false, message: "Platform fee not found" });
    }

    res.status(201).json({ status: true, message: "Platform fee updated successfully", data: updatedFee });

  } catch (error) {
    console.error("Error updating platform fee:", error);
    res.status(500).json({status: false, message: "Internal server error" });
  }
};

export const getPlatformFee = async (req, res) => {
  try {
    const platformfee = await platformFee.findOne({ _id: "68304dbc0a656a74ff3b669c" });
    if (platformfee) {
      res.status(201).json({ status: true, message: "Get Platform fee successfully", data: platformfee });

    } else {
      res.status(404).json({ status: false, message: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}

export const getSinglePlatformFee = async (req, res) => {
  try {
    const {id}=req.body;
    console.log("id",id)
    const platformfee = await platformFee.findOne({ _id:id });
    if (platformfee) {
      res.status(201).json({ status: true, message: "Get Platform fee successfully", data: platformfee });
    } else {
      res.status(404).json({ status: false, message: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}

export const getPaymentHistory = async (req, res) => {
  try {
    const PaymentHistory = await depositHistory.find({}).sort({ _id: -1 });
    if (PaymentHistory) {
      res.status(201).json({ status: true, message: "Get PaymentHistory successfully", data: PaymentHistory });
    } else {
      res.status(404).json({ status: false, message: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}

export const getSinglePaymentHistory = async (req, res) => {
  try {
    const {id}=req.body;
    console.log("id",id)
    const platformfee = await depositHistory.findOne({ _id:id });
    if (platformfee) {
      res.status(201).json({ status: true, message: "Get PaymentHistory successfully", data: platformfee });
    } else {
      res.status(404).json({ status: false, message: "Something went wrong" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Internal server error" });
  }
}


export const registerScannerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existingUser = await ScannerUser.findOne({ email });
    if (existingUser) {
      return res.status(400).json({status:false, message: "User already exists" });
    }
    const user = await ScannerUser.create({
      name,
      email,
      password: password,
    });
    return res.status(201).json({status:true, message: "User created", user });
  } catch (err) {
    return res.status(500).json({status:false, message: "Internal server error" });
  }
};


export const getRegisterScannerUser = async (req, res) => {
  try {
    const existingUser = await ScannerUser.find({ }).sort({ _id: -1 });
    if (!existingUser) {
      return res.status(400).json({status:false, message: "No data found" });
    }
    return res.status(201).json({status:true,  user:existingUser });
  } catch (err) {
    return res.status(500).json({status:false, message: "Internal server error" });
  }
};

export const deleteScannerUser = async (req, res) => {
  try {
    const { id } = req.body;
    const offer = await ScannerUser.findByIdAndDelete(id);
    if (!offer) {
      return res
        .status(404)
        .json({ message: "Scanner User not found", status: false });
    }
    res
      .status(200)
      .json({ message: "Scanner User deleted successfully", status: true });
  } catch (error) {
    res.status(500).json({ error: error.message, status: false });
  }
};
