import { Server } from "socket.io";
import Event from "./models/events.js";
import User from "./models/user.js";
export const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket"],
    pingInterval: 10000, 
    pingTimeout: 5000,
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinRoom", async ({ userId, eventId }) => {
      try {
        const user = await User.findById(userId);
        if (!user) throw new Error("User not found");

        const event = await Event.findById(eventId);
        if (!event) throw new Error("Event not found");

        const organizerId = event.createdBy;
        if (!organizerId) throw new Error("Organizer not found");

        const room = [userId, organizerId.toString()].sort().join("_");
        socket.join(room);

        console.log(`User ${userId} joined room: ${room}`);
        socket.emit("roomJoined", { room });
      } catch (error) {
        console.error("Join room error:", error);
        socket.emit("error", { message: "An error occurred in joinRoom" });
      }
    });

    socket.on("sendMessage", async ({ senderId, eventId, message }) => {
      try {
        const user = await User.findById(senderId);
        if (!user) return socket.emit("error", { message: "User not found" });

        const event = await Event.findById(eventId);
        if (!event) return socket.emit("error", { message: "Event not found" });

        const receiverId = event.createdBy; 
        const receiver = await User.findById(receiverId);
        if (!receiver) return socket.emit("error", { message: "Receiver not found" });
    
        const room = [senderId, receiverId.toString()].sort().join("_");

        const newMessage = {
          senderId,
          receiverId,
          message,
          timestamp: new Date(),
        };

        event.chats = event.chats || [];
        event.chats.push(newMessage);
        await event.save();

        io.to(room).emit("receiveMessage", newMessage);

        console.log(`Message from ${senderId} to ${receiverId}: ${message}`);
        if (receiver.fcmToken) {
          const payload = {
            notification: {
              title: `New message from ${user.name}`,
              body: message,
            },
            token: receiver.fcmToken,
          };
          await admin.messaging().send(payload);
          console.log("Notification sent to receiver");
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
    });
    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  });
};

