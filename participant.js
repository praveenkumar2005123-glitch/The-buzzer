(() => {
  const $ = (id) => document.getElementById(id);
  const joinBtn = $('joinBtn');
  const buzzBtn = $('buzzBtn');
  const leaveBtn = $('leaveBtn');
  let room = '';
  let name = '';
  let playerId = localStorage.getItem('lol_player_id') || crypto.randomUUID();
  localStorage.setItem('lol_player_id', playerId);
  let roomRef, stateListener;

  function configured() {
    return window.firebaseConfig && !String(window.firebaseConfig.apiKey || '').includes('PASTE_');
  }

  function tone(type='buzz') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type === 'error' ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(type === 'error' ? 170 : 440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(type === 'error' ? 95 : 120, ctx.currentTime + .32);
      gain.gain.setValueAtTime(.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .35);
      osc.start(); osc.stop(ctx.currentTime + .36);
    } catch (_) {}
  }

  function setStatus(pill, title, text, enabled) {
    $('statusPill').textContent = pill;
    $('resultTitle').textContent = title;
    $('resultText').textContent = text;
    buzzBtn.disabled = !enabled;
  }

  joinBtn.addEventListener('click', async () => {
    room = $('roomCode').value.trim();
    name = $('displayName').value.trim();
    if (!/^\d{6}$/.test(room)) return $('joinMessage').textContent = 'Enter a valid six-digit room code.';
    if (name.length < 2) return $('joinMessage').textContent = 'Enter your participant or team name.';
    if (!configured()) return $('joinMessage').textContent = 'Firebase is not configured. Open config.js and add your Firebase details.';

    if (!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    const db = firebase.database();
    roomRef = db.ref(`rooms/${room}`);
    const snap = await roomRef.once('value');
    if (!snap.exists()) return $('joinMessage').textContent = 'Room not found. Check the code with the Quiz Master.';

    await roomRef.child(`participants/${playerId}`).set({ name, joinedAt: firebase.database.ServerValue.TIMESTAMP });
    roomRef.child(`participants/${playerId}`).onDisconnect().remove();

    $('activeRoom').textContent = room;
    $('activeName').textContent = name;
    $('joinCard').classList.add('hidden');
    $('buzzerStage').classList.remove('hidden');

    stateListener = roomRef.on('value', (s) => {
      const data = s.val();
      if (!data) {
        setStatus('Room Closed', 'Event Room Ended', 'The Quiz Master has ended this room.', false);
        return;
      }
      const winner = data.winner;
      if (winner) {
        if (winner.playerId === playerId) setStatus('Accepted First', 'You Buzzed First!', 'Wait for the Quiz Master to recognize your answer.', false);
        else setStatus('Buzzer Locked', 'Too Late', `${winner.name} buzzed first.`, false);
      } else if (data.enabled) {
        setStatus('Buzzer Enabled', 'Ready!', 'Press the buzzer as fast as you can.', true);
      } else {
        setStatus('Waiting for Quiz Master', 'Buzzer Locked', 'The Quiz Master has not enabled the buzzer yet.', false);
      }
    });
  });

  buzzBtn.addEventListener('click', async () => {
    if (!roomRef || buzzBtn.disabled) return;
    buzzBtn.disabled = true;
    tone('buzz');
    if (navigator.vibrate) navigator.vibrate([120,50,180]);
    const buzzRef = roomRef.child("buzzes").push();

await buzzRef.set({
    name: name,
    playerId: playerId,
    timestamp: firebase.database.ServerValue.TIMESTAMP
});

buzzBtn.disabled = true;
setStatus(
    "Buzz Sent",
    "Recorded",
    "Your buzz has been recorded.",
    false
);
    if (!result.committed) tone('error');
  });

  leaveBtn.addEventListener('click', async () => {
    try { if (roomRef) await roomRef.child(`participants/${playerId}`).remove(); } catch (_) {}
    location.reload();
  });
})();
