

import mongoose from "mongoose";

const depositHistorySchema = new mongoose.Schema({

    "serviceCode": { type: String },
    "bearerCode": { type: String },
    "language": { type: String },
    "initiator": { type: String },
    "transactionAmount": { type: String },
    "currency": { type: String },
    "externalReferenceId": { type: String },
    "source": { type: String },
    "remarks": { type: String },
    "transactionMode": { type: String },
    transactor: {
        "idType": { type: String },
        "idValue": { type: String },
        "productId": { type: String },
        "mpin": { type: String },
        "tpin": { type: String }
    },
    sender: {
        "idType": { type: String },
        "idValue": { type: String },
        "productId": { type: String }
    },
    "txnStatus": { type: String, default: "" },
    "serviceRequestId": { type: String, default: "" },
    "mfsTenantId": { type: String, default: "" },
    "language": { type: String, default: "" },
    "serviceFlow": { type: String, default: "" },
    "message": { type: String, default: "" },
    "transactionId": { type: String, default: "" },
    "remarks": { type: String, default: "" },
    "originalServiceRequestId": { type: String, default: "" },
    "status": { type: String, default: "PENDING" },
    
    "STATUSCODE": { type: String, default: "" },
    "FEES_PAYER_PAID": { type: String, default: "" },
    "TXNDATE": { type: String, default: "" },
    "TRANSID": { type: String, default: "" },
    "TXNAMT": { type: String, default: "" },
    "TXNID": { type: String, default: "" },
},
    {
        timestamps: true,
    }
);

export default mongoose.model("depositHistory", depositHistorySchema);







