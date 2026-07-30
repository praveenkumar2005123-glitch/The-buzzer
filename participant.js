(() => {
  const $ = (id) => document.getElementById(id);

  const joinBtn = $("joinBtn");
  const buzzBtn = $("buzzBtn");
  const leaveBtn = $("leaveBtn");

  let room = "";
  let name = "";
  let playerId =
    localStorage.getItem("lol_player_id") || crypto.randomUUID();

  localStorage.setItem("lol_player_id", playerId);

  let roomRef;
  let stateListener;
  let hasBuzzed = false;

  function configured() {
    return (
      window.firebaseConfig &&
      !String(window.firebaseConfig.apiKey || "").includes("PASTE_")
    );
  }

  function tone(type = "buzz") {
    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.type = type === "error" ? "sawtooth" : "square";

      oscillator.frequency.setValueAtTime(
        type === "error" ? 170 : 440,
        context.currentTime
      );

      oscillator.frequency.exponentialRampToValueAtTime(
        type === "error" ? 95 : 120,
        context.currentTime + 0.32
      );

      gain.gain.setValueAtTime(0.18, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + 0.35
      );

      oscillator.start();
      oscillator.stop(context.currentTime + 0.36);
    } catch (error) {
      console.error(error);
    }
  }

  function setStatus(pill, title, text, enabled) {
    $("statusPill").textContent = pill;
    $("resultTitle").textContent = title;
    $("resultText").textContent = text;
    buzzBtn.disabled = !enabled;
  }

  joinBtn.addEventListener("click", async () => {
    room = $("roomCode").value.trim();
    name = $("displayName").value.trim();

    if (!/^\d{6}$/.test(room)) {
      $("joinMessage").textContent =
        "Enter a valid six-digit room code.";
      return;
    }

    if (name.length < 2) {
      $("joinMessage").textContent =
        "Enter your participant or team name.";
      return;
    }

    if (!configured()) {
      $("joinMessage").textContent =
        "Firebase is not configured. Open config.js and add your Firebase details.";
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
      }

      const db = firebase.database();
      roomRef = db.ref(`rooms/${room}`);

      const snapshot = await roomRef.once("value");

      if (!snapshot.exists()) {
        $("joinMessage").textContent =
          "Room not found. Check the code with the Quiz Master.";
        return;
      }

      await roomRef.child(`participants/${playerId}`).set({
        name,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      });

      roomRef
        .child(`participants/${playerId}`)
        .onDisconnect()
        .remove();

      $("activeRoom").textContent = room;
      $("activeName").textContent = name;

      $("joinCard").classList.add("hidden");
      $("buzzerStage").classList.remove("hidden");

      stateListener = roomRef.on("value", (roomSnapshot) => {
        const data = roomSnapshot.val();

        if (!data) {
          setStatus(
            "Room Closed",
            "Event Room Ended",
            "The Quiz Master has ended this room.",
            false
          );
          return;
        }

        const myBuzz = Object.values(data.buzzes || {}).find(
          (buzz) => buzz.playerId === playerId
        );

        if (myBuzz) {
          hasBuzzed = true;

          setStatus(
            "Buzz Recorded",
            "Your Buzz Is Recorded",
            "Wait for the Quiz Master.",
            false
          );
          return;
        }

        if (data.enabled) {
          hasBuzzed = false;

          setStatus(
            "Buzzer Enabled",
            "Ready!",
            "Press the buzzer as fast as you can.",
            true
          );
        } else {
          hasBuzzed = false;

          setStatus(
            "Waiting for Quiz Master",
            "Buzzer Locked",
            "The Quiz Master has not enabled the buzzer yet.",
            false
          );
        }
      });
    } catch (error) {
      console.error(error);
      $("joinMessage").textContent =
        "Unable to join room. Check Firebase connection.";
    }
  });

  buzzBtn.addEventListener("click", async () => {
    if (!roomRef || buzzBtn.disabled || hasBuzzed) return;

    hasBuzzed = true;
    buzzBtn.disabled = true;

    tone("buzz");

    if (navigator.vibrate) {
      navigator.vibrate([120, 50, 180]);
    }

    try {
      await roomRef.child("buzzes").push({
        name,
        playerId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });

      setStatus(
        "Buzz Recorded",
        "Your Buzz Is Recorded",
        "Wait for the Quiz Master.",
        false
      );
    } catch (error) {
      console.error(error);

      hasBuzzed = false;
      buzzBtn.disabled = false;

      tone("error");

      setStatus(
        "Error",
        "Buzz Not Recorded",
        "Try pressing the buzzer again.",
        true
      );
    }
  });

  leaveBtn.addEventListener("click", async () => {
    try {
      if (roomRef) {
        await roomRef.child(`participants/${playerId}`).remove();
      }
    } catch (error) {
      console.error(error);
    }

    location.reload();
  });
})();
