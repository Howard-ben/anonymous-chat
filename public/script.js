// script.js - client
const socket = io();
let currentRoom = "";
let myNickname = "";
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const nicknameInput = document.getElementById("nickname");
const roomInput = document.getElementById("room");
const generateBtn = document.getElementById("generate-room");
const joinBtn = document.getElementById("join-btn");
const leaveBtn = document.getElementById("leave-btn");
const darkToggle = document.getElementById("dark-toggle");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const onlineList = document.getElementById("online-list");
const typingIndicator = document.getElementById("typing-indicator");
const roomName = document.getElementById("room-name");
const roomCount = document.getElementById("room-count");

let typingTimeout;

// helpers
function generateId(len=6){
  const chars="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s="";
  for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

generateBtn.addEventListener("click", () => roomInput.value = generateId(6));

// join
joinBtn.addEventListener("click", () => {
  const nickname = nicknameInput.value.trim();
  const room = roomInput.value.trim();
  if (!room) return alert("Enter or generate a room ID");
  currentRoom = room;
  myNickname = nickname || ""; // server will auto-assign if blank
  socket.emit("joinRoom", { room, nickname });
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  roomName.textContent = "Room: " + currentRoom;
});

// Leave
leaveBtn.addEventListener("click", () => location.reload());

// dark toggle
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  darkToggle.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
});

// send message
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// typing indicator logic
messageInput.addEventListener("input", () => {
  if (!currentRoom) return;
  socket.emit("typing", { room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", { room: currentRoom });
  }, 1200);
});

function sendMessage(){
  const text = messageInput.value.trim();
  if (!text || !currentRoom) return;
  socket.emit("chatMessage", { room: currentRoom, message: text });
  messageInput.value = "";
  socket.emit("stopTyping", { room: currentRoom });
}

// render a message
function renderMessage(msg){
  // msg: { id, userId, user, text, ts }
  const div = document.createElement("div");
  div.className = "message";
  div.dataset.id = msg.id;
  const me = msg.userId === socket.id;
  if (me) div.classList.add("me"); else div.classList.add("other");

  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date(msg.ts || Date.now()).toLocaleTimeString();
  meta.innerHTML = `<strong>${msg.user}</strong> <span class="small muted">${time}</span>`;
  const body = document.createElement("div");
  body.className = "body";
  body.textContent = msg.text;

  // controls: delete if mine, invite button on messages from others for private chat
  const controls = document.createElement("div");
  controls.className = "controls";

  if (me){
    const del = document.createElement("button");
    del.className = "msg-btn";
    del.textContent = "Delete";
    del.onclick = () => {
      const id = msg.id;
      socket.emit("deleteMessage", { room: currentRoom, messageId: id });
    };
    controls.appendChild(del);
  } else {
    const invite = document.createElement("button");
    invite.className = "msg-btn";
    invite.textContent = "Invite";
    invite.onclick = () => {
      // invite the user who sent this message - need to find their socketId in online list
      // we can store mapping in dataset of online list items
      const userItem = document.querySelector(`#online-list li[data-name="${msg.user}"]`);
      if (userItem){
        const targetSocketId = userItem.dataset.socket;
        if (confirm(`Invite ${msg.user} to a private chat?`)){
          socket.emit("invitePrivate", { targetSocketId });
          alert("Invite sent.");
        }
      } else {
        alert("User not found (may have disconnected).");
      }
    };
    controls.appendChild(invite);
  }

  div.appendChild(meta);
  div.appendChild(body);
  div.appendChild(controls);

  messagesDiv.appendChild(div);
  // nice scroll and animation handled by CSS
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// remove message (on deletion)
function removeMessageById(id){
  const el = messagesDiv.querySelector(`.message[data-id="${id}"]`);
  if (el){
    // fade out then remove
    el.style.transition = "opacity .18s, transform .18s";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(()=> el.remove(), 190);
  }
}

// render online users list
function renderOnlineList(users){
  onlineList.innerHTML = "";
  roomCount.textContent = `${users.length} online`;
  users.forEach(u => {
    const li = document.createElement("li");
    li.dataset.socket = u.socketId;
    li.dataset.name = u.nickname;
    const left = document.createElement("div");
    left.className = "user-badge";
    const badge = document.createElement("div");
    badge.className = "badge";
    badge.textContent = u.badge.split("-")[0].slice(0,3).toUpperCase();
    const name = document.createElement("div");
    name.textContent = u.nickname;
    left.appendChild(badge);
    left.appendChild(name);

    const inviteBtn = document.createElement("button");
    inviteBtn.className = "invite-btn";
    inviteBtn.textContent = "Invite";
    inviteBtn.onclick = () => {
      if (u.socketId === socket.id) { alert("You cannot invite yourself."); return; }
      if (confirm(`Invite ${u.nickname} to a private chat?`)) {
        socket.emit("invitePrivate", { targetSocketId: u.socketId });
        alert("Invite sent.");
      }
    };

    li.appendChild(left);
    li.appendChild(inviteBtn);
    onlineList.appendChild(li);
  });
}

// SOCKET EVENTS
socket.on("connect", () => {
  // can use socket.id if needed
});

socket.on("roomHistory", (messages) => {
  messagesDiv.innerHTML = "";
  messages.forEach(m => renderMessage(m));
});

socket.on("message", (msg) => {
  // if legacy system messages from server (System text without id), normalize
  if (!msg.id) msg.id = "sys-" + Date.now();
  renderMessage(msg);
});

socket.on("messageDeleted", ({ messageId }) => removeMessageById(messageId));

socket.on("onlineUsers", (users) => renderOnlineList(users));

socket.on("displayTyping", ({ user }) => {
  typingIndicator.classList.remove("hidden");
  typingIndicator.textContent = `${user} is typing...`;
});

socket.on("removeTyping", () => {
  typingIndicator.classList.add("hidden");
});

// Private invite received
socket.on("privateInvite", ({ from, privateRoom, inviterSocketId }) => {
  const accept = confirm(`${from} invited you to a private chat (room ${privateRoom}). Accept?`);
  if (accept) {
    socket.emit("acceptInvite", { privateRoom, inviterSocketId });
    // switch UI to that private room
    currentRoom = privateRoom;
    roomInput.value = privateRoom;
    roomName.textContent = "Room: " + currentRoom;
    messagesDiv.innerHTML = "";
    // join screen/state already handled by server; show chat
    joinScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
  } else {
    alert("Invite declined.");
  }
});

// Invite sent confirmation from server (optional)
socket.on("inviteSent", ({ privateRoom }) => {
  // auto-join inviter into private room (server will invite inviter too)
  currentRoom = privateRoom;
  roomInput.value = privateRoom;
  roomName.textContent = "Room: " + currentRoom;
  messagesDiv.innerHTML = "";
  joinScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
});

// error messages
socket.on("errorMsg", (txt) => alert(txt));
