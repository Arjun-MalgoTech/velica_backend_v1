
import mongoose from "mongoose";
const offerSchema = new mongoose.Schema({
  image: { type: String, default: "" },
  code:{type:String,default:""},
  description: {
    type:String,
    default: "",
  },
},{
  timestamps: true,
});



export default mongoose.model("Offer", offerSchema);
