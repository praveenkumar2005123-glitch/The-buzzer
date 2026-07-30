# Link Ohh Link – Real-Time Buzzer Website

A website-only buzzer system for participants and the Quiz Master. It has no scores, leaderboard, registration form, or app-style navigation.

## Files
- `index.html` – participant website
- `admin.html` – Quiz Master control website
- `style.css` – black and gold design
- `participant.js` – participant join and buzz logic
- `admin.js` – room creation, enable, lock and reset controls
- `config.js` – Firebase settings
- `database.rules.json` – simple testing rules

## Firebase setup
1. Open Firebase Console and create a project.
2. Add a Web App.
3. Create **Realtime Database**.
4. During testing, choose test mode.
5. Copy the web app configuration into `config.js`.
6. Open Realtime Database → Rules and paste the contents of `database.rules.json`, then publish.

The included rules are open for easy event testing. Do not use them for a public long-term production system.

## Publish on Vercel
1. Extract the ZIP.
2. Upload the entire extracted folder to Vercel.
3. Open the generated website link for participants.
4. Add `/admin` to the same link for the Quiz Master because Vercel clean URLs are enabled.

Examples:
- Participant: `https://your-project.vercel.app`
- Quiz Master: `https://your-project.vercel.app/admin`

## Event flow
1. Quiz Master opens the admin page and creates a room.
2. Participants open the main page, enter room code and name, then join.
3. Quiz Master clicks **Enable Buzzer**.
4. First participant to click **BUZZ** is accepted.
5. Everyone else is locked automatically.
6. Quiz Master clicks **Reset for Next Question**.

## Notes
- Sound is generated in the browser, so no MP3 file is required.
- Vibration works only on supported phones and browsers.
- A stable Wi-Fi or mobile data connection is important for all devices.
