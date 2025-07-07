import mongoose from "mongoose";


const chatSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "senderType",
  },
  senderType: {
    type: String,
    enum: ["OrganizerData", "UserData"],
  },
  Name: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const eventSchema = new mongoose.Schema(
  {
    organizationName: { type: String, default: "" },
    category: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    phoneNumber: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    BBAN: { type: String, default: "" },
    eventImages: [{ type: String }],

    venueDetails: [
      {
        eventName: { type: String, default: "" },
        venueName: { type: String, default: "" },
        address: { type: String, default: "" },
        date: { type: String, default: "" },
        time: { type: String, default: "" },
        location: { type: String, default: "" },
        status: { type: Boolean, default: true },
        type: { type: String, default: "" },
        lng: { type: String, default: "" },
        lat: { type: String, default: "" },
        eventRating: [
          {
            name: { type: String },
            email: { type: String },
            ratings: { type: Number },
            comment: { type: String },
            userID: { type: String },
          },
          {
            timestamps: true,
          },
        ],
        Favorites: [
          {
            userID: { type: String },
            status: { type: Boolean, default: false },
          },
          {
            timestamps: true,
          },
        ],
        ticket: [
          {
            team: { type: String },
            price: { type: Number },
            total_Ticket: { type: Number },
            remaining_Ticket: { type: Number },
          },
        ],
      },
    ],
    bankName: { type: String, default: "" },
    duration: { type: String, default: "" },
    ageLimit: { type: String, default: "" },
    language: { type: String, default: "" },
    aboutEvent: { type: String, default: "" },
    terms_Condition: { type: String, default: "" },
    document: { type: String, default: "" },
    businessDocument: { type: String, default: "" },
    status: { type: String, default: "pending" },
    createdBy: { type: String, default: "" },
    chats: [chatSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Events", eventSchema);
