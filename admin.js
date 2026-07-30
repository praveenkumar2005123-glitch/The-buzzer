(() => {
  const $ = (id) => document.getElementById(id);
  let room = '';
  let roomRef;

  function configured(){return window.firebaseConfig && !String(window.firebaseConfig.apiKey||'').includes('PASTE_')}
  function code(){return String(Math.floor(100000 + Math.random()*900000))}
  function fmt(ts){return ts ? new Date(ts).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit',fractionalSecondDigits:3}) : '—'}
  function setAdminStatus(text){$('adminStatus').textContent=text}

  $('createRoomBtn').addEventListener('click', async () => {
    if(!configured()) return $('adminMessage').textContent='Firebase is not configured. Add your Firebase details in config.js.';
    if(!firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
    const db=firebase.database();
    do { room=code(); roomRef=db.ref(`rooms/${room}`); } while((await roomRef.once('value')).exists());
    await roomRef.set({enabled:false,createdAt:firebase.database.ServerValue.TIMESTAMP,winner:null,participants:{}});
    $('roomCodeDisplay').textContent=room;
    $('createPanel').classList.add('hidden');
    $('controlPanel').classList.remove('hidden');
    roomRef.onDisconnect().update({enabled:false});
    roomRef.on('value', s=>{
      const data=s.val(); if(!data) return;
      setAdminStatus(data.winner?'LOCKED':data.enabled?'OPEN':'LOCKED');
      $('enableBtn').disabled=!!data.winner || !!data.enabled;
      $('lockBtn').disabled=!data.enabled;
      if(data.winner){
        $('winnerEmpty').classList.add('hidden'); $('winnerResult').classList.remove('hidden');
        $('winnerName').textContent=data.winner.name; $('winnerTime').textContent=`Buzzed at ${fmt(data.winner.timestamp)}`;
      } else {
        $('winnerResult').classList.add('hidden'); $('winnerEmpty').classList.remove('hidden');
      }
      const list=$('participantList'); const participants=data.participants||{}; const entries=Object.values(participants);
      list.innerHTML=entries.length?entries.map(p=>`<div class="participant-chip">${escapeHtml(p.name)}</div>`).join(''):'<p class="muted">Nobody has joined yet.</p>';
    });
  });

  $('enableBtn').addEventListener('click',()=>roomRef&&roomRef.update({enabled:true,winner:null}));
  $('lockBtn').addEventListener('click',()=>roomRef&&roomRef.update({enabled:false}));
  $('resetBtn').addEventListener('click',()=>roomRef&&roomRef.update({enabled:false,winner:null}));
  $('copyRoomBtn').addEventListener('click',async()=>{await navigator.clipboard.writeText(room); $('copyRoomBtn').textContent='Copied'; setTimeout(()=>$('copyRoomBtn').textContent='Copy Room Code',1200)});
  $('endRoomBtn').addEventListener('click',async()=>{if(roomRef&&confirm('End this room for everyone?')){await roomRef.remove();location.reload()}});

  function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]))}
})();
