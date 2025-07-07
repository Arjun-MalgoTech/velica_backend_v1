
import mongoose from "mongoose";
const platformFeeSchema = new mongoose.Schema({
  fee: { type: Number, default: 0 },
},{
  timestamps: true,
});



export default mongoose.model("platformFee", platformFeeSchema);
