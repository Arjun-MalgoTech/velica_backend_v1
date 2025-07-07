import mongoose from "mongoose";

const contactUsSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    brief: { type: String, required: true },
    status: { type: Boolean, default: true },
},
{
    timestamps: true,
  }
);

export default mongoose.model("contactUs", contactUsSchema);
