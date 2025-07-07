import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const chatSchema = new mongoose.Schema({

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "senderType",
  },
  senderType: {
    type: String,
    enum: ["OrganizerData", "UserData"],
  },
  message: String,
  timestamp: { type: Date, default: Date.now },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Events",
  },
});
const userSchema = new mongoose.Schema({
  notification: { type: Boolean, default: true },
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  fcmToken: {
    type: String,
    default: "",
  },
  email: {
    type: String,

  },
  chats: [chatSchema],
  phone: {
    type: String,

  },
  password: {
    type: String,
  },
  about: {
    type: String,
    default: "",
  },
  image: { type: String, default: "" },

  areaOfInterest: {
    type: [String],
    default: [],
  },
  type: { type: String, default: "" },
  otp: {
    type: Number,
  },
  otpExpiresAt: {
    type: Date,
  },
  resetToken: String,
  isVerified: {
    type: Boolean,
    default: false,
  },

  Following: [
    {
      name: { type: String },
      email: { type: String },
      profileImage: { type: String },
      status: { type: Boolean }
    },
    {
      timestamps: true,
    }
  ],
  isLogin: { type: Boolean },
  Followers: [
    {
      name: { type: String },
      email: { type: String },
      profileImage: { type: String },
      status: { type: Boolean }
    },
    {
      timestamps: true,
    }
  ],

},
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model("User", userSchema);
