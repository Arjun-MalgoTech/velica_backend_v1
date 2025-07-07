import mongoose from 'mongoose';

const webContactUsSchema = new mongoose.Schema({

    email: { type: String },
    firstname: { type: String },
    lastname: { type: String },
    message: { type: String },
},
    {
        timestamps: true,
    }
);

const Notification = mongoose.model('webContactUs', webContactUsSchema);
export default Notification;
