import notification from "../models/notification.js";

export const sendEventNotification = async (userId, title, eventDate) => {
 
  try {
    await notification.create({
      userId,
      title,
      type: 'event',
      eventDate,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};