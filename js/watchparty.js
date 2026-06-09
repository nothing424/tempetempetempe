// ===== TEMPEPLAY - WATCH PARTY (Firebase Realtime DB) =====
const BACKEND = 'https://hsjshsjs-tempeplay-backend.hf.space';

let roomCode = null;
let isHost   = false;
let unsubRoom = null;
let unsubChat = null;

function genCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

window.addEventListener('firebase-ready', () => {
  const { ref, set, get, update, push, onValue,
          serverTimestamp, query, orderByChild, limitToLast } = window.firebaseFns;
  const db = window.firebaseDB;

  // ── Create Room ──
  document.getElementById('btn-create-room')?.addEventListener('click', async () => {
    if (!window.currentUser) { window.showAuthModal(); return; }
    const code = genCode();
    const roomRef = ref(db, `rooms/${code}`);
    await set(roomRef, {
      code,
      host: window.currentUser.uid,
      hostName: window.currentUser.displayName || 'Host',
      videoTime: 0,
      playing: false,
      createdAt: Date.now()
    });
    await set(ref(db, `rooms/${code}/members/${window.currentUser.uid}`), {
      name: window.currentUser.displayName || 'Host',
      photo: window.currentUser.photoURL || '',
      joinedAt: Date.now()
    });
    isHost = true;
    joinRoom(code);
  });

  // ── Join Room ──
  document.getElementById('btn-join-room')?.addEventListener('click', async () => {
    if (!window.currentUser) { window.showAuthModal(); return; }
    const code = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (code.length < 4) { showToast('Kode tidak valid!', 'error'); return; }
    const snap = await get(ref(db, `rooms/${code}`));
    if (!snap.exists()) { showToast('Room tidak ditemukan!', 'error'); return; }
    await set(ref(db, `rooms/${code}/members/${window.currentUser.uid}`), {
      name: window.currentUser.displayName || 'Guest',
      photo: window.currentUser.photoURL || '',
      joinedAt: Date.now()
    });
    isHost = snap.val().host === window.currentUser.uid;
    joinRoom(code);
  });

  document.getElementById('room-code-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-join-room')?.click();
  });

  function joinRoom(code) {
    roomCode = code;
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('party-room').classList.remove('hidden');
    document.getElementById('room-code-display').textContent = code;

    // Copy code
    document.getElementById('btn-copy-code')?.addEventListener('click', () => {
      navigator.clipboard.writeText(code);
      showToast('Kode disalin! 📋');
    });

    // Listen room
    unsubRoom = onValue(ref(db, `rooms/${code}`), (snap) => {
      if (!snap.exists()) { leaveRoom(); return; }
      const data = snap.val();
      renderMembers(data.members || {});
      const count = Object.keys(data.members || {}).length;
      document.getElementById('room-status').textContent =
        `👥 ${count} orang nonton ${isHost ? '• 👑 Kamu Host' : ''}`;
      syncVideo(data);
    });

    // Listen chat
    const chatQ = query(ref(db, `rooms/${code}/chat`), orderByChild('time'), limitToLast(100));
    unsubChat = onValue(chatQ, (snap) => {
      const msgs = [];
      snap.forEach(child => msgs.push({ id: child.key, ...child.val() }));
      renderChat(msgs);
    });

    // Video sync (host only)
    const videoEl = document.getElementById('video-player');
    if (isHost) {
      videoEl?.addEventListener('play',   () => update(ref(db, `rooms/${code}`), { playing: true,  videoTime: videoEl.currentTime }));
      videoEl?.addEventListener('pause',  () => update(ref(db, `rooms/${code}`), { playing: false, videoTime: videoEl.currentTime }));
      videoEl?.addEventListener('seeked', () => update(ref(db, `rooms/${code}`), { videoTime: videoEl.currentTime }));
    }

    // Chat send
    document.getElementById('btn-send-chat')?.addEventListener('click', () => sendChat(code));
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChat(code);
    });

    // Leave
    document.getElementById('btn-leave-room')?.addEventListener('click', leaveRoom);

    addSystemMsg(`${window.currentUser?.displayName || 'Kamu'} bergabung 🎉`);
  }

  async function sendChat(code) {
    const input = document.getElementById('chat-input');
    const text  = input.value.trim();
    if (!text || !window.currentUser) return;
    input.value = '';
    await push(ref(db, `rooms/${code}/chat`), {
      uid:   window.currentUser.uid,
      name:  window.currentUser.displayName || 'User',
      photo: window.currentUser.photoURL || '',
      text,
      time: Date.now()
    });
  }

  function syncVideo(data) {
    if (isHost) return;
    const videoEl = document.getElementById('video-player');
    if (!videoEl?.src) return;
    const drift = Math.abs(videoEl.currentTime - (data.videoTime || 0));
    if (drift > 2) videoEl.currentTime = data.videoTime || 0;
    if (data.playing && videoEl.paused)  videoEl.play().catch(() => {});
    if (!data.playing && !videoEl.paused) videoEl.pause();
  }

  function renderChat(msgs) {
    const container = document.getElementById('chat-messages');
    const isBottom  = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    container.innerHTML = msgs.map(m => {
      const isMe = m.uid === window.currentUser?.uid;
      const avatar = m.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0D8ABC&color=fff`;
      return `
        <div class="chat-msg ${isMe ? 'me' : ''}">
          <img class="chat-msg-avatar" src="${avatar}" alt="${m.name}" />
          <div class="chat-msg-body">
            <div class="chat-msg-name">${m.name}${isMe ? ' (kamu)' : ''}</div>
            <div class="chat-msg-text">${escHtml(m.text)}</div>
          </div>
        </div>`;
    }).join('');
    document.getElementById('chat-count').textContent = `${msgs.length} pesan`;
    if (isBottom) container.scrollTop = container.scrollHeight;
  }

  function renderMembers(members) {
    document.getElementById('members-list').innerHTML =
      Object.entries(members).map(([uid, m]) => {
        const avatar = m.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0D8ABC&color=fff`;
        return `
          <div class="member-chip ${uid === window.currentUser?.uid ? 'host' : ''}">
            <img src="${avatar}" alt="${m.name}" />
            ${m.name}
          </div>`;
      }).join('');
  }

  function addSystemMsg(msg) {
    const el = document.createElement('div');
    el.className = 'chat-system';
    el.textContent = msg;
    document.getElementById('chat-messages')?.appendChild(el);
  }

  async function leaveRoom() {
    if (unsubRoom) { unsubRoom(); unsubRoom = null; }
    if (unsubChat) { unsubChat(); unsubChat = null; }
    if (roomCode && window.currentUser) {
      try {
        const { remove } = window.firebaseFns;
        await remove(ref(db, `rooms/${roomCode}/members/${window.currentUser.uid}`));
      } catch(e) {}
    }
    document.getElementById('party-room').classList.add('hidden');
    document.getElementById('lobby').classList.remove('hidden');
    roomCode = null;
    showToast('Keluar dari room 👋');
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
});
