(() => {
  const $ = (id) => document.getElementById(id);

  let room = "";
  let roomRef;

  function configured() {
    return (
      window.firebaseConfig &&
      !String(window.firebaseConfig.apiKey || "").includes("PASTE_")
    );
  }

  function code() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function fmt(ts) {
    return ts
      ? new Date(ts).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          fractionalSecondDigits: 3
        })
      : "—";
  }

  function setAdminStatus(text) {
    $("adminStatus").textContent = text;
  }

  $("createRoomBtn").addEventListener("click", async () => {
    if (!configured()) {
      $("adminMessage").textContent =
        "Firebase is not configured. Add your Firebase details in config.js.";
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
      }

      const db = firebase.database();

      do {
        room = code();
        roomRef = db.ref(`rooms/${room}`);
      } while ((await roomRef.once("value")).exists());

      await roomRef.set({
        enabled: false,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        buzzes: null,
        participants: {}
      });

      $("roomCodeDisplay").textContent = room;
      $("createPanel").classList.add("hidden");
      $("controlPanel").classList.remove("hidden");

      roomRef.onDisconnect().update({
        enabled: false
      });

      roomRef.on("value", (snapshot) => {
        const data = snapshot.val();

        if (!data) return;

        setAdminStatus(data.enabled ? "OPEN" : "LOCKED");

        $("enableBtn").disabled = !!data.enabled;
        $("lockBtn").disabled = !data.enabled;

        const buzzes = Object.values(data.buzzes || {}).sort(
          (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
        );

        if (buzzes.length) {
          $("winnerEmpty").classList.add("hidden");
          $("winnerResult").classList.remove("hidden");

          $("winnerName").innerHTML = buzzes
            .map((buzz, index) => {
              const medals = ["🥇", "🥈", "🥉"];
              const medal = medals[index] || `#${index + 1}`;

              return `
                <div style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:12px;
                  padding:10px 0;
                  border-bottom:1px solid rgba(255,255,255,.08);
                ">
                  <span>${medal} ${escapeHtml(buzz.name)}</span>
                  <small>${fmt(buzz.timestamp)}</small>
                </div>
              `;
            })
            .join("");

          $("winnerTime").textContent =
            `${buzzes.length} participant(s) buzzed`;
        } else {
          $("winnerResult").classList.add("hidden");
          $("winnerEmpty").classList.remove("hidden");
        }

        const list = $("participantList");
        const participants = data.participants || {};
        const entries = Object.values(participants);

        list.innerHTML = entries.length
          ? entries
              .map(
                (participant) =>
                  `<div class="participant-chip">${escapeHtml(
                    participant.name
                  )}</div>`
              )
              .join("")
          : '<p class="muted">Nobody has joined yet.</p>';
      });
    } catch (error) {
      console.error(error);
      $("adminMessage").textContent =
        "Unable to create room. Check Firebase connection and database rules.";
    }
  });

  $("enableBtn").addEventListener("click", async () => {
    if (!roomRef) return;

    await roomRef.update({
      enabled: true,
      buzzes: null
    });
  });

  $("lockBtn").addEventListener("click", async () => {
    if (!roomRef) return;

    await roomRef.update({
      enabled: false
    });
  });

  $("resetBtn").addEventListener("click", async () => {
    if (!roomRef) return;

    await roomRef.update({
      enabled: false,
      buzzes: null
    });
  });

  $("copyRoomBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(room);

      $("copyRoomBtn").textContent = "Copied";

      setTimeout(() => {
        $("copyRoomBtn").textContent = "Copy Room Code";
      }, 1200);
    } catch (error) {
      console.error(error);
    }
  });

  $("endRoomBtn").addEventListener("click", async () => {
    if (!roomRef) return;

    if (confirm("End this room for everyone?")) {
      await roomRef.remove();
      location.reload();
    }
  });

  function escapeHtml(value) {
    return String(value).replace(
      /[&<>'"]/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#039;",
          '"': "&quot;"
        })[character]
    );
  }
})();
