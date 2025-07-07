import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  type: { type: String },
  timestamp: { type: Date, default: Date.now },
  eventDate: Date,
  read: { type: Boolean, default: false }
});

const Notification = mongoose.model('notification', notificationSchema);
export default Notification;
