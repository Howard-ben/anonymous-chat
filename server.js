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

// Handle connections
io.on("connection", (socket) => {
  console.log("A new user connected:", socket.id);

  socket.on("joinRoom", ({ room, nickname }) => {
    socket.join(room);
    socket.data.nickname = nickname;
    socket.data.room = room;

    console.log(`${nickname} joined room: ${room}`);

    // Notify everyone in the room (except the new user)
    socket.to(room).emit("message", {
      user: "System",
      text: `${nickname} joined the chat.`,
    });

    // Send a welcome message to the new user
    socket.emit("message", {
      user: "System",
      text: `Welcome to room ${room}, ${nickname}!`,
    });
  });

  // Broadcast message to everyone in the room (including sender)
  socket.on("chatMessage", ({ room, user, message }) => {
    io.to(room).emit("message", { user, text: message });
  });

  socket.on("disconnect", () => {
    const nickname = socket.data.nickname || "A user";
    const room = socket.data.room;
    if (room) {
      io.to(room).emit("message", {
        user: "System",
        text: `${nickname} has left the chat.`,
      });
    }
    console.log("A user disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
