const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ Message storage file
const chatFile = path.join(__dirname, "chats.json");
let chatHistory = {};

// Load old chats (if any)
if (fs.existsSync(chatFile)) {
  chatHistory = JSON.parse(fs.readFileSync(chatFile));
}

// Save chats to file
function saveChats() {
  fs.writeFileSync(chatFile, JSON.stringify(chatHistory, null, 2));
}

// Track users
const roomUsers = {};

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("joinRoom", ({ room, nickname }) => {
    socket.join(room);
    socket.data.room = room;
    socket.data.nickname = nickname;

    if (!roomUsers[room]) roomUsers[room] = new Set();
    roomUsers[room].add(nickname);

    // Load old chat history
    if (chatHistory[room]) {
      chatHistory[room].forEach((msg) => {
        socket.emit("message", msg);
      });
    }

    // System join messages
    socket.emit("message", { user: "System", text: `Welcome ${nickname}!` });
    socket.to(room).emit("message", { user: "System", text: `${nickname} joined the room.` });

    io.to(room).emit("updateUsers", Array.from(roomUsers[room]));
  });

  // New chat message
  socket.on("chatMessage", ({ room, user, message }) => {
    const msg = { user, text: message };
    io.to(room).emit("message", msg);

    // Save to history
    if (!chatHistory[room]) chatHistory[room] = [];
    chatHistory[room].push(msg);
    saveChats();
  });

  // Typing indicator
  socket.on("typing", ({ room, user }) => {
    socket.to(room).emit("displayTyping", { user });
  });
  socket.on("stopTyping", ({ room }) => {
    socket.to(room).emit("removeTyping");
  });

  // Delete message
  socket.on("deleteMessage", ({ room, user, text }) => {
    if (chatHistory[room]) {
      chatHistory[room] = chatHistory[room].filter((m) => m.text !== text || m.user !== user);
      saveChats();
    }
    io.to(room).emit("message", { user: "System", text: `${user} deleted a message.` });
  });

  // Disconnect handling
  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nickname = socket.data.nickname;
    if (room && roomUsers[room]) {
      roomUsers[room].delete(nickname);
      io.to(room).emit("message", { user: "System", text: `${nickname} left the chat.` });
      io.to(room).emit("updateUsers", Array.from(roomUsers[room]));
      if (roomUsers[room].size === 0) delete roomUsers[room];
    }
    console.log("🔴 User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`✅ DmlAnonChat Server running on port ${PORT}`);
});
