const socket = io();
const joinContainer = document.getElementById("join-container");
const chatContainer = document.getElementById("chat-container");
const joinBtn = document.getElementById("join-btn");
const generateBtn = document.getElementById("generate-room");
const leaveBtn = document.getElementById("leave-btn");
const darkToggle = document.getElementById("dark-toggle");
const roomInput = document.getElementById("room");
const nicknameInput = document.getElementById("nickname");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const roomName = document.getElementById("room-name");
const typingIndicator = document.getElementById("typing-indicator");

let typingTimeout;

// Generate Room ID
generateBtn.addEventListener("click", () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  roomInput.value = id;
});

// Join Room
joinBtn.addEventListener("click", () => {
  const room = roomInput.value.trim();
  const nickname = nicknameInput.value.trim();
  if (!room || !nickname) return alert("Enter both room ID and nickname!");

  socket.emit("joinRoom", { room, nickname });

  joinContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  roomName.textContent = "Room: " + room;
});

// Send message
sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  const room = roomInput.value.trim();
  const user = nicknameInput.value.trim();
  if (message === "") return;
  socket.emit("chatMessage", { room, user, message });
  messageInput.value = "";
  socket.emit("stopTyping", { room });
});

// Display messages
socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Typing Indicator Logic
messageInput.addEventListener("input", () => {
  const room = roomInput.value.trim();
  const user = nicknameInput.value.trim();
  socket.emit("typing", { room, user });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { room });
  }, 1500);
});

socket.on("displayTyping", ({ user }) => {
  typingIndicator.classList.remove("hidden");
  typingIndicator.textContent = `${user} is typing...`;
});

socket.on("removeTyping", () => {
  typingIndicator.classList.add("hidden");
});

// Leave Room
leaveBtn.addEventListener("click", () => {
  window.location.reload();
});

// 🌙 Dark Mode Toggle
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  darkToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
});
