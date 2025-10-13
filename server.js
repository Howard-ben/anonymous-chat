// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // When a user joins a room
  socket.on("joinRoom", ({ room, nickname }) => {
    socket.join(room);
    socket.nickname = nickname;
    console.log(`${nickname} joined room: ${room}`);

    socket.to(room).emit("message", {
      user: "System",
      text: `${nickname} has joined the chat.`,
    });
  });

  // When a message is sent
  socket.on("chatMessage", ({ room, user, message }) => {
    io.to(room).emit("message", { user, text: message });
  });

  // When user disconnects
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
