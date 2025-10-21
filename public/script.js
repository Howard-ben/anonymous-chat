const socket = io();

const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const chatSection = document.getElementById("chat-section");
const chatBox = document.getElementById("chat-box");
const roomSetup = document.getElementById("room-setup");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send");
const userList = document.getElementById("userList");
const roomTitle = document.getElementById("roomTitle");
const downloadBtn = document.getElementById("download-app");

let nickname = "";
let room = "";
let deferredPrompt;
const hasInstalled = localStorage.getItem("dml_installed");

// Join room
joinRoomBtn.addEventListener("click", () => {
  nickname = nicknameInput.value.trim() || "Anon-" + Math.floor(Math.random() * 1000);
  room = roomInput.value.trim() || "global";
  socket.emit("joinRoom", { room, nickname });

  roomSetup.classList.add("hidden");
  chatSection.classList.remove("hidden");
  roomTitle.innerHTML = `Room: <strong>${room}</strong>`;
});

// Receive message
socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (msg.user !== nickname && msg.user !== "System") {
    showNotification(msg.user, msg.text);
  }
});

// Send message
sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message === "") return;
  socket.emit("chatMessage", { room, user: nickname, message });
  messageInput.value = "";
});

// Update user list
socket.on("updateUsers", (users) => {
  userList.innerHTML = `👥 Online: ${users.join(", ")}`;
});

// Push notifications
if ("serviceWorker" in navigator && "Notification" in window) {
  navigator.serviceWorker.ready.then((registration) => {
    if (Notification.permission === "default") Notification.requestPermission();
  });
}

function showNotification(user, message) {
  if (Notification.permission === "granted") {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification("💬 New Message", {
        body: `${user}: ${message}`,
        icon: "icon-192.png",
        badge: "icon-192.png",
      });
    });
  }
}

// Install button logic (first-time only)
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!hasInstalled) downloadBtn.classList.remove("hidden");
});

downloadBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    localStorage.setItem("dml_installed", "true");
  } else {
    localStorage.setItem("dml_installed", "dismissed");
  }
  downloadBtn.classList.add("hidden");
  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  localStorage.setItem("dml_installed", "true");
  downloadBtn.classList.add("hidden");
});
