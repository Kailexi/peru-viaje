/* ===================================================================
   FIREBASE CONFIG — fill this in with YOUR OWN project's credentials.
   ===================================================================

   This project only uses Firebase for FIRESTORE (the departure date,
   photo-pair metadata, and friend notes) — all of which stay fully
   free on the Spark plan. The actual image FILES are hosted on
   Cloudinary instead of Firebase Storage; see cloudinary-config.js
   and the README for why and how to set that up.

   1. Go to https://console.firebase.google.com and create a free
      project (Spark / free plan is enough for this site).
   2. In your project, click the "</>" (web app) icon to register a
      new web app. Firebase will show you a config object exactly
      like the one below — copy your real values into it here.
   3. In the Firebase console, enable:
        - Firestore Database  (Build > Firestore Database > Create database)
      (Do NOT enable Storage — it now requires the paid Blaze plan
      even for free-tier usage, which is why this project uses
      Cloudinary for images instead.)
   4. See README.md in this folder for the security rules to paste in
      for Firestore.

   Do NOT worry about this apiKey being "secret" — Firebase web API
   keys are meant to be public; your Firestore SECURITY RULES are
   what actually protect your data. Just make sure you set the rules
   from the README.
   =================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDD0DVkL3hp43yM-2cCoH59XgoVpaE55Y8",
  authDomain: "tanya-viaje.firebaseapp.com",
  projectId: "tanya-viaje",
  storageBucket: "tanya-viaje.firebasestorage.app",
  messagingSenderId: "773490710221",
  appId: "1:773490710221:web:f82e465bedfd1b776ffb84",
  measurementId: "G-4E3KGK0XMS"
};


// Initialize Firebase (compat SDK, loaded via <script> tags in index.html)
firebase.initializeApp(firebaseConfig);

// Exposed for app.js — Firestore only. Image files themselves are
// hosted on Cloudinary instead of Firebase Storage (see
// cloudinary-config.js) since Firebase Storage now requires the
// paid Blaze plan even for free-tier usage, while Cloudinary's free
// plan needs no card at all. Firestore still just needs Spark (free).
const db = firebase.firestore();
