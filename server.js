// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Track users in each room
const roomUsers = {}; // { roomName: Set(users) }

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // 🧩 Join a room
  socket.on("joinRoom", ({ room, nickname }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.nickname = nickname;

    // Add user to tracking list
    if (!roomUsers[room]) roomUsers[room] = new Set();
    roomUsers[room].add(nickname);

    console.log(`👤 ${nickname} joined ${room}`);

    // Welcome message for new user
    socket.emit("message", {
      user: "System",
      text: `Welcome ${nickname}! You joined room ${room}.`,
    });

    // Notify all in the room
    io.to(room).emit("message", {
      user: "System",
      text: `${nickname} has joined the chat.`,
    });

    // Update user list in room
    io.to(room).emit("updateUsers", Array.from(roomUsers[room]));
  });

  // 💬 Chat messages
  socket.on("chatMessage", ({ room, user, message }) => {
    if (!room) return;
    io.to(room).emit("message", { user, text: message });
  });

  // ✍️ Typing indicator
  socket.on("typing", ({ room, user }) => {
    socket.to(room).emit("displayTyping", { user });
  });

  socket.on("stopTyping", ({ room }) => {
    socket.to(room).emit("removeTyping");
  });

  // 🗑️ Delete message broadcast
  socket.on("deleteMessage", ({ room, user, text }) => {
    io.to(room).emit("message", {
      user: "System",
      text: `${user} deleted a message.`,
    });
  });

  // 🔄 Update user list on disconnect
  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nickname = socket.data.nickname;

    if (room && roomUsers[room]) {
      roomUsers[room].delete(nickname);

      io.to(room).emit("message", {
        user: "System",
        text: `${nickname} has left the chat.`,
      });

      // Send updated user list
      io.to(room).emit("updateUsers", Array.from(roomUsers[room]));

      if (roomUsers[room].size === 0) delete roomUsers[room];
    }

    console.log("🔴 User disconnected:", socket.id);
  });
});

// 🟢 Start server
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
