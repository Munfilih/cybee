// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBsdPghRmOsLX7JIj-T8IYF4bRp-KxQAPc",
    authDomain: "cybee-ca5a2.firebaseapp.com",
    projectId: "cybee-ca5a2",
    storageBucket: "cybee-ca5a2.firebasestorage.app",
    messagingSenderId: "215321650697",
    appId: "1:215321650697:web:fc87fe543e54d2eec9bad8",
    measurementId: "G-PTVWPGDE10"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Export for use in other files
window.auth = auth;
window.db = db;
window.storage = storage;