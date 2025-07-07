import mongoose from "mongoose";

const scannerUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  isLogin: { type: Boolean },
},
  {
    timestamps: true,
  }
);

export default mongoose.model("ScannerUser", scannerUserSchema);
