const socket = io();
const joinContainer = document.getElementById("join-container");
const chatContainer = document.getElementById("chat-container");
const joinBtn = document.getElementById("join-btn");
const generateBtn = document.getElementById("generate-room");
const leaveBtn = document.getElementById("leave-btn");
const roomInput = document.getElementById("room");
const nicknameInput = document.getElementById("nickname");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const roomName = document.getElementById("room-name");

function generateRoomID() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  roomInput.value = id;
}

generateBtn.addEventListener("click", generateRoomID);

joinBtn.addEventListener("click", () => {
  const room = roomInput.value.trim();
  const nickname = nicknameInput.value.trim();
  if (!room || !nickname) return alert("Enter both room ID and nickname!");

  socket.emit("joinRoom", { room, nickname });

  joinContainer.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  roomName.textContent = "Room: " + room;
});

sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  const room = roomInput.value.trim();
  const user = nicknameInput.value.trim();
  if (message === "") return;
  socket.emit("chatMessage", { room, user, message });
  messageInput.value = "";
});

socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

leaveBtn.addEventListener("click", () => {
  window.location.reload();
});
