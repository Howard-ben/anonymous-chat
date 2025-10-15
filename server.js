// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// In-memory store (replace with DB for production)
const rooms = new Map(); // roomId -> { users: Map(socketId->userObj), messages: [] }
// userObj: { socketId, nickname, badge }

// serve static
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// helper: create room entry
function ensureRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: new Map(), messages: [] });
  }
  return rooms.get(roomId);
}

// helper: get users list for room
function getUsersArray(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.values()).map(u => ({
    socketId: u.socketId,
    nickname: u.nickname,
    badge: u.badge
  }));
}

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // assign a default badge generator
  function genBadge() {
    const animals = ["Fox","Wolf","Tiger","Eagle","Otter","Hawk","Panda","Lion","Bear","Shark"];
    const num = Math.floor(Math.random()*9000) + 100;
    const pick = animals[Math.floor(Math.random()*animals.length)];
    return `${pick}-${num}`;
  }

  // Join a public/room
  socket.on("joinRoom", ({ room, nickname }) => {
    if (!room) return;
    const chosenNick = (nickname && nickname.trim()) || genBadge();
    const roomObj = ensureRoom(room);

    // add user to room map
    roomObj.users.set(socket.id, { socketId: socket.id, nickname: chosenNick, badge: chosenNick });
    socket.join(room);
    socket.data.room = room;
    socket.data.nickname = chosenNick;

    // send existing messages to the joining client
    socket.emit("roomHistory", roomObj.messages);

    // Notify everyone in room about new user
    io.to(room).emit("message", { id: uuidv4(), user: "System", text: `${chosenNick} joined the chat.`, ts: Date.now() });

    // Update online user list in room
    io.to(room).emit("onlineUsers", getUsersArray(room));
  });

  // Chat message - store and broadcast
  socket.on("chatMessage", ({ room, message }) => {
    if (!room || !message) return;
    const roomObj = ensureRoom(room);
    const msg = {
      id: uuidv4(),
      userId: socket.id,
      user: socket.data.nickname || "Anon",
      text: message,
      ts: Date.now()
    };
    roomObj.messages.push(msg);
    // broadcast to everyone in room
    io.to(room).emit("message", msg);
  });

  // Delete message: only owner can delete
  socket.on("deleteMessage", ({ room, messageId }) => {
    if (!room || !messageId) return;
    const roomObj = rooms.get(room);
    if (!roomObj) return;
    const msgIndex = roomObj.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) return;
    const msg = roomObj.messages[msgIndex];
    // only allow delete if owner matches socket.id
    if (msg.userId !== socket.id) {
      socket.emit("errorMsg", "You can only delete your own messages.");
      return;
    }
    // remove message
    roomObj.messages.splice(msgIndex, 1);
    // notify clients to remove this message
    io.to(room).emit("messageDeleted", { messageId });
  });

  // typing indicator
  socket.on("typing", ({ room }) => {
    if (!room) return;
    socket.to(room).emit("displayTyping", { user: socket.data.nickname });
  });
  socket.on("stopTyping", ({ room }) => {
    if (!room) return;
    socket.to(room).emit("removeTyping", { user: socket.data.nickname });
  });

  // Private invite: inviter sends targetSocketId, server emits invite to that socket
  socket.on("invitePrivate", ({ targetSocketId }) => {
    const from = socket.data.nickname || "Anon";
    if (!targetSocketId) return;
    // create a private room id
    const privateRoom = uuidv4().slice(0, 8).toUpperCase();
    // send invitation to target
    io.to(targetSocketId).emit("privateInvite", { from, privateRoom, inviterSocketId: socket.id });
    // also notify inviter that invite was sent
    socket.emit("inviteSent", { privateRoom, targetSocketId });
  });

  // Target accepts invite: server makes both join private room and notifies them
  socket.on("acceptInvite", ({ privateRoom, inviterSocketId }) => {
    if (!privateRoom || !inviterSocketId) return;
    // ensure room
    ensureRoom(privateRoom);
    // join asker
    socket.join(privateRoom);
    const accepterNick = socket.data.nickname || genBadge();
    rooms.get(privateRoom).users.set(socket.id, { socketId: socket.id, nickname: accepterNick, badge: accepterNick });
    socket.data.room = privateRoom;

    // add inviter (if still connected) to the private room
    const inviterSocket = io.sockets.sockets.get(inviterSocketId);
    if (inviterSocket) {
      inviterSocket.join(privateRoom);
      // ensure inviter is tracked in room users (use their known nickname)
      const invNick = inviterSocket.data.nickname || genBadge();
      rooms.get(privateRoom).users.set(inviterSocketId, { socketId: inviterSocketId, nickname: invNick, badge: invNick });
      // notify both about the new private room
      io.to(privateRoom).emit("message", { id: uuidv4(), user: "System", text: `Private chat started between ${invNick} and ${accepterNick}`, ts: Date.now() });
      io.to(privateRoom).emit("onlineUsers", getUsersArray(privateRoom));
      // send room history (empty) to both; just in case
      io.to(privateRoom).emit("roomHistory", rooms.get(privateRoom).messages);
    } else {
      socket.emit("errorMsg", "The inviter is no longer online.");
    }
  });

  // handle disconnect
  socket.on("disconnect", () => {
    const room = socket.data.room;
    const nickname = socket.data.nickname;
    if (room && rooms.has(room)) {
      const roomObj = rooms.get(room);
      roomObj.users.delete(socket.id);
      // broadcast leave message and updated list
      io.to(room).emit("message", { id: uuidv4(), user: "System", text: `${nickname || "A user"} left the chat.`, ts: Date.now() });
      io.to(room).emit("onlineUsers", getUsersArray(room));
      // if room empty, remove it to free memory
      if (roomObj.users.size === 0) {
        rooms.delete(room);
      }
    }
    console.log("Disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
