import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

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

// Fetch wish-list items
function fetchWishListItems() {
  const user = auth.currentUser;
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const wishList = JSON.parse(localStorage.getItem(`wishList_${user.uid}`)) || [];
  const wishListContainer = document.getElementById("wishlist-items");
  wishListContainer.innerHTML = "";

  wishList.forEach((item) => {
    const wishListItem = `
      <div class="wishlist-item">
        <img src="${item.image}" alt="${item.name}">
        <h3>${item.name}</h3>
        <p>$${item.price}</p>
        <button onclick="removeFromWishList('${item.productId}')">Remove</button>
      </div>
    `;
    wishListContainer.innerHTML += wishListItem;
  });
}

// Remove item from wish-list
window.removeFromWishList = (productId) => {
  const user = auth.currentUser;
  if (!user) return;

  const wishList = JSON.parse(localStorage.getItem(`wishList_${user.uid}`)) || [];
  const updatedWishList = wishList.filter((item) => item.productId !== productId);
  localStorage.setItem(`wishList_${user.uid}`, JSON.stringify(updatedWishList));

  fetchWishListItems();
};

// Check if user is authenticated
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    fetchWishListItems();
  }
});

