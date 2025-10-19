const socket = io();
const chatBox = document.getElementById("chat-box");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send");
let nickname = "Anon-" + Math.floor(Math.random() * 1000);

// Join the default chat room
socket.emit("joinRoom", { room: "global", nickname });

// Send message
sendBtn.addEventListener("click", () => {
  const message = messageInput.value.trim();
  if (message === "") return;
  socket.emit("chatMessage", { room: "global", user: nickname, message });
  messageInput.value = "";
});

// Display chat messages
socket.on("message", (msg) => {
  const div = document.createElement("div");
  div.classList.add("message");
  div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  // 🔔 Notification
  if (msg.user !== nickname && msg.user !== "System") {
    showNotification(msg.user, msg.text);
  }
});

// 🔔 Push Notifications
if ("serviceWorker" in navigator && "Notification" in window) {
  navigator.serviceWorker.ready.then((registration) => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
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

// 🟦 DmlAnonChat Install Button (only shows for new users)
let deferredPrompt;
const downloadBtn = document.getElementById("download-app");

// Check localStorage to remember users who already installed or dismissed
const hasInstalled = localStorage.getItem("dml_installed");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show only if user hasn’t installed or dismissed before
  if (!hasInstalled) {
    downloadBtn.classList.remove("hidden");
  }
});

downloadBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    console.log("✅ DmlAnonChat installed!");
    localStorage.setItem("dml_installed", "true");
  } else {
    console.log("❌ User dismissed install prompt");
    localStorage.setItem("dml_installed", "dismissed");
  }

  downloadBtn.classList.add("hidden");
  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  localStorage.setItem("dml_installed", "true");
  downloadBtn.classList.add("hidden");
});
