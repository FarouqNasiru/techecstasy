import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcwOu27SDWqxPpM9z3WNdVTLKt6OyIPVQ",
  authDomain: "tecstasy-b983f.firebaseapp.com",
  projectId: "tecstasy-b983f",
  storageBucket: "tecstasy-b983f.firebasestorage.app",
  messagingSenderId: "476018649191",
  appId: "1:476018649191:web:658266178580b03f6accc2",
  measurementId: "G-EL41HV8PSE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable persistence
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistence enabled");
  })
  .catch((error) => {
    console.error("Error enabling persistence:", error);
  });

// Owner's email address
const OWNER_EMAIL = "farouqnasiru@gmail.com";

// DOM elements
const authForm = document.getElementById("auth-form");
const authButton = document.getElementById("auth-button");
const toggleAuth = document.getElementById("toggle-auth");
const authTitle = document.getElementById("auth-title");
const nameFields = document.getElementById("name-fields");
const errorMessage = document.getElementById("error-message");

let isLoginMode = true;

// Toggle between login and signup
toggleAuth.addEventListener("click", () => {
  isLoginMode = !isLoginMode;
  
  if (isLoginMode) {
    authTitle.textContent = "Login";
    authButton.textContent = "Login";
    toggleAuth.textContent = "Sign up";
    nameFields.style.display = "none";
  } else {
    authTitle.textContent = "Sign Up";
    authButton.textContent = "Sign Up";
    toggleAuth.textContent = "Login";
    nameFields.style.display = "block";
  }
  
  // Clear form and errors
  authForm.reset();
  errorMessage.classList.add("hidden");

  // In the toggle function
if (isLoginMode) {
  // ...
  document.getElementById("firstName").disabled = true;
  document.getElementById("lastName").disabled = true;
} else {
  // ...
  document.getElementById("firstName").disabled = false;
  document.getElementById("lastName").disabled = false;
}
});

// Function to create user document in Firestore
async function createUserDocument(user, firstName = "", lastName = "") {
  const userRef = doc(db, "users", user.uid);
  try {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: firstName || user.displayName || '',
      firstName: firstName || '',
      lastName: lastName || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      purchaseHistory: [],
      isOwner: user.email === OWNER_EMAIL
    }, { merge: true });
  } catch (error) {
    console.error("Error creating user document:", error);
    throw error;
  }
}

// Common function to handle successful authentication
async function handleSuccessfulAuth(user) {
  await createUserDocument(user);
  
  if (user.email === OWNER_EMAIL) {
    window.location.href = "owner-dashboard.html";
  } else {
    window.location.href = "shop.html";
  }
}

// Handle form submission
authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  try {
    if (isLoginMode) {
      // Login existing user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await handleSuccessfulAuth(userCredential.user);
    } else {
      // Register new user
      const firstName = document.getElementById("firstName").value;
      const lastName = document.getElementById("lastName").value;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserDocument(userCredential.user, firstName, lastName);
      await handleSuccessfulAuth(userCredential.user);
    }
  } catch (error) {
    showError(getUserFriendlyError(error.code));
  }
});

// Handle Google Sign-In
document.getElementById("google-sign-in").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const userCredential = await signInWithPopup(auth, provider);
    await handleSuccessfulAuth(userCredential.user);
  } catch (error) {
    showError(getUserFriendlyError(error.code));
  }
});

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

// Convert Firebase error codes to user-friendly messages
function getUserFriendlyError(errorCode) {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please login instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/user-not-found":
      return "No account found with this email. Please sign up.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "An error occurred. Please try again.";
  }
}

// Check auth state on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in, update their last login timestamp
    const userRef = doc(db, "users", user.uid);
    setDoc(userRef, {
      lastLogin: serverTimestamp()
    }, { merge: true }).catch(error => {
      console.error("Error updating last login:", error);
    });
  }
});