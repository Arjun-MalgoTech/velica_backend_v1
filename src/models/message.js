import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({

roomId: String,
sender: String,
receiver: String,
text: String,
timestamp: { type: Date, default: Date.now },
read: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

export default Message;