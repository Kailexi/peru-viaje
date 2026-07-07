
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


const db = firebase.firestore();
