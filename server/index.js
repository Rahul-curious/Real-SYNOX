const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = 3001;
const CORS_ORIGIN = "http://localhost:5173";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// ================= USERS PER ROOM =================
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  /* ================= JOIN ROOM ================= */
  socket.on("join_room", ({ room, username }) => {
    socket.join(room);

    if (!roomUsers[room]) roomUsers[room] = [];

    // remove duplicate socket or username
    roomUsers[room] = roomUsers[room].filter(
      (u) => u.id !== socket.id && u.username !== username
    );

    roomUsers[room].push({ id: socket.id, username });

    io.to(room).emit(
      "room_users",
      roomUsers[room].map((u) => u.username)
    );
  });

  /* ================= CHAT ================= */
  socket.on("send_message", (data) => {
    io.to(data.room).emit("receive_message", {
      ...data,
      status: "sent",
    });
  });

  socket.on("message_seen", ({ room, messageId }) => {
    socket.to(room).emit("message_seen", messageId);
  });

  socket.on("delete_message", ({ room, messageId }) => {
    io.to(room).emit("message_deleted", messageId);
  });

  /* ================= TYPING ================= */
  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("user_typing", username);
  });

  socket.on("stop_typing", (room) => {
    socket.to(room).emit("user_stop_typing");
  });

  /* ================= 📞 CALL SIGNALING ================= */

  // Start call
  socket.on("call_user", ({ room, from, type }) => {
    console.log(`📞 ${type} call from ${from} in room ${room}`);
    socket.to(room).emit("incoming_call", { from, type });
  });

  // Accept call
  socket.on("accept_call", (data) => {
    console.log("✅ Call accepted:", data);
    socket.to(data.room).emit("call_accepted", data);
  });

  // Reject call
  socket.on("reject_call", (data) => {
    console.log("❌ Call rejected:", data);
    socket.to(data.room).emit("call_rejected", data);
  });

  // End call (MANDATORY)
  socket.on("end_call", ({ room }) => {
    console.log("🛑 Call ended in room:", room);
    socket.to(room).emit("call_ended");
  });

  /* ================= 🌐 WEBRTC SIGNALING ================= */

  socket.on("webrtc_offer", (data) => {
    socket.to(data.room).emit("webrtc_offer", data);
  });

  socket.on("webrtc_answer", (data) => {
    socket.to(data.room).emit("webrtc_answer", data);
  });

  socket.on("ice_candidate", (data) => {
    socket.to(data.room).emit("ice_candidate", data);
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
    for (const room in roomUsers) {
      roomUsers[room] = roomUsers[room].filter(
        (u) => u.id !== socket.id
      );

      io.to(room).emit(
        "room_users",
        roomUsers[room].map((u) => u.username)
      );
    }

    console.log("❌ User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log("🚀 SERVER RUNNING on port", PORT);
});
