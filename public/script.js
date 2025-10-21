const socket = io();
let room, nickname;
const messages = document.getElementById("messages");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const usersList = document.getElementById("users");
const typingIndicator = document.getElementById("typing");
const shareLinkBtn = document.getElementById("share-link-btn");

// Generate random anonymous name
function generateAnonName() {
  return "Anon-" + Math.floor(Math.random() * 10000);
}

// Generate random room ID
function generateRoomID() {
  return "room-" + Math.random().toString(36).substring(2, 7);
}

// Check if a room is in the URL
const urlParams = new URLSearchParams(window.location.search);
room = urlParams.get("room") || generateRoomID();
nickname = localStorage.getItem("nickname") || generateAnonName();
localStorage.setItem("nickname", nickname);

// If room was newly generated, update URL
if (!urlParams.get("room")) {
  const newUrl = `${window.location.origin}?room=${room}`;
  window.history.replaceState({}, "", newUrl);
}

// Display share link button
shareLinkBtn.classList.remove("hidden");
shareLinkBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(window.location.href);
  alert("✅ Room link copied! Share it with your friend to chat together.");
});

// Join room on connect
socket.emit("joinRoom", { room, nickname });

// Display messages
socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  if (msg.user === "System") div.classList.add("system");
  div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// Show users online
socket.on("updateUsers", (users) => {
  usersList.innerHTML = "";
  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user;
    usersList.appendChild(li);
  });
});

// Typing indicator
messageInput.addEventListener("input", () => {
  socket.emit("typing", { room, user: nickname });
  clearTimeout(window.typingTimeout);
  window.typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { room });
  }, 1500);
});

socket.on("displayTyping", ({ user }) => {
  typingIndicator.textContent = `${user} is typing...`;
});

socket.on("removeTyping", () => {
  typingIndicator.textContent = "";
});

// Send message
sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit("chatMessage", { room, user: nickname, message });
    messageInput.value = "";
  }
});

// Press Enter to send
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
