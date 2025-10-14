// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ room, nickname }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.nickname = nickname;

    console.log(`${nickname} joined ${room}`);

    socket.emit("message", {
      user: "System",
      text: `Welcome ${nickname}! You joined room ${room}.`,
    });

    io.to(room).emit("message", {
      user: "System",
      text: `${nickname} has joined the chat.`,
    });
  });

  // Broadcast message to everyone in room
  socket.on("chatMessage", ({ room, user, message }) => {
    if (!room) return;
    io.to(room).emit("message", { user, text: message });
  });

  // Typing indicator
  socket.on("typing", ({ room, user }) => {
    socket.to(room).emit("displayTyping", { user });
  });

  socket.on("stopTyping", ({ room }) => {
    socket.to(room).emit("removeTyping");
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nickname = socket.data.nickname;
    if (room && nickname) {
      io.to(room).emit("message", {
        user: "System",
        text: `${nickname} has left the chat.`,
      });
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
