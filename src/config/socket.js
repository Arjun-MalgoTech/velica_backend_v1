import { Server } from "socket.io";
import Events from "../models/events.js"; 
import User from "../models/user.js";

let socket;

export const socketListen = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinEventChat", ({ eventId, userId, userType }) => {
      socket.join(eventId);
      console.log(`${userType} (${userId}) joined chat for event ${eventId}`);
    });

    socket.on("getEventChats", async ({ eventId }, callback) => {
      try {
        const event = await Events.findById(eventId).populate(
          "chats.sender",
          "name email"
        );
        if (!event) throw new Error("Event not found");
        callback({ status: true, chats: event.chats });
      } catch (err) {
        console.error("getEventChats error:", err.message);
        callback({ status: false, error: err.message });
      }
    });

    socket.on(
      "sendEventMessage",
      async ({ eventId, senderId, senderType, message }) => {
        try {

          const event = await Events.findById(eventId);
          if (!event) throw new Error("Event not found");

          if (!["OrganizerData", "UserData"].includes(senderType)) {
            throw new Error("Invalid sender type");
          }

          let senderName = "Unknown";
let sender;
      let receiver;
          if (senderType === "UserData") {
            const user = await User.findById(senderId).lean();
            sender = await User.findById(senderId).lean();
            if (!user) throw new Error("User not found");
            senderName = user.name;
          } else if (senderType === "OrganizerData") {
            const organizer = await User.findById(event.createdBy).lean();
            if (!organizer) throw new Error("Organizer user not found");
            senderName = organizer.name;
          }

          const newMessage = {
            sender: senderId,
            senderType,
            Name: senderName,
            message,
          };

          event.chats.push(newMessage);
          await event.save();

          const emittedMessage = {
            ...newMessage,
            timestamp: new Date(),
          };

          console.log(
            "📤 Emitting newEventMessage to room:",
            eventId,
            emittedMessage
          );
          io.to(eventId).emit("newEventMessage", { emittedMessage });
        } catch (err) {
          console.error("sendEventMessage error:", err.message);
          socket.emit("error", { message: err.message });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  socket = io;
};

export const emitMessage = (name, message) => {
  if (socket) {
    socket.emit(name, message);
  }
};
