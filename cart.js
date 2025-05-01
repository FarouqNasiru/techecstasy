import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  arrayUnion,
  setDoc,
  serverTimestamp,
  increment,
  writeBatch
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

let currentUser = null;

// Check if user is authenticated
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    currentUser = user;
    displayCartItems(user.uid);
  }
});

// Function to calculate cart total
function calculateTotal(cartItems) {
  return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Display cart items
function displayCartItems(userId) {
  const cart = JSON.parse(localStorage.getItem(`cart_${userId}`)) || [];
  const cartContainer = document.getElementById("cart-items");

  if (cart.length === 0) {
    cartContainer.innerHTML = "<p>Your cart is empty.</p>";
    document.getElementById("checkout-button").style.display = "none";
    return;
  }

  let total = calculateTotal(cart);
  const cartHTML = cart.map((item, index) => {
    const imageSrc = getImageSource(item);
    const productName = item.name || 'Unnamed Product';
    const productPrice = item.price || 0;
    const productQuantity = item.quantity || 1;
    
    return `
      <div class="cart-item">
        ${imageSrc ? `<img src="${imageSrc}" alt="${productName}" class="cart-item-image">` : ''}
        <div class="cart-item-details">
          <h3>${productName}</h3>
          <p>Price: ₦${productPrice}</p>
          <p>Total: ₦${(productPrice * productQuantity).toFixed(2)}</p>
          <button class="remove-button" data-index="${index}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  cartContainer.innerHTML = `
    ${cartHTML}
    <div class="cart-total">
      <h3>Total: ₦${total.toFixed(2)}</h3>
      <button id="checkout-button">Proceed to Checkout</button>
    </div>
  `;

  // Add event listeners
  document.querySelectorAll(".remove-button").forEach(button => {
    button.addEventListener("click", () => {
      const index = button.getAttribute("data-index");
      removeItemFromCart(userId, index);
    });
  });

  document.getElementById("checkout-button").addEventListener("click", async () => {
    if (!currentUser) {
      alert("Please log in to complete your purchase.");
      window.location.href = "login.html";
      return;
    }

    const userId = currentUser.uid;
    const cart = JSON.parse(localStorage.getItem(`cart_${userId}`)) || [];
    
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    // Check for billing info
    const billingInfo = await checkBillingInfo(userId);
    
    if (!billingInfo) {
      // Show billing info modal if no info exists
      showBillingModal();
      const saved = await saveBillingInfo(userId);
      if (!saved) return;
    }

    // Proceed to payment
    await processPayment(currentUser, cart);
  });
}

// Billing Info Functions
async function checkBillingInfo(userId) {
  try {
    const docRef = doc(db, "billingInfo", userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error checking billing info:", error);
    return null;
  }
}

function showBillingModal() {
  const modal = document.getElementById("billingModal");
  modal.style.display = "block";
  
  document.querySelector(".close").onclick = () => {
    modal.style.display = "none";
  };
  
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };
}

async function saveBillingInfo(userId) {
  return new Promise((resolve) => {
    document.getElementById("billingForm").onsubmit = async (e) => {
      e.preventDefault();
      
      const billingData = {
        fullName: document.getElementById("fullName").value,
        phone: document.getElementById("phone").value,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        lastUpdated: serverTimestamp()
      };
      
      try {
        await setDoc(doc(db, "billingInfo", userId), billingData);
        document.getElementById("billingModal").style.display = "none";
        resolve(true);
      } catch (error) {
        console.error("Error saving billing info:", error);
        alert("Failed to save billing information. Please try again.");
        resolve(false);
      }
    };
  });
}

// Payment Processing
async function processPayment(user, cartItems) {
  const totalAmount = calculateTotal(cartItems) * 100; // Convert to kobo
  
  const handler = PaystackPop.setup({
    key: 'pk_test_47178ae2e5bcae596fe8a7623ef668317cb82957',
    email: user.email,
    amount: totalAmount,
    currency: 'NGN',
    ref: 'PS_' + Math.floor(Math.random() * 1000000000),
    callback: async (response) => {
      try {
        await completePurchase(user, cartItems, response.reference);
        alert('Payment successful! Reference: ' + response.reference);
        window.location.href = `payments.html?id=${response.reference}`;
      } catch (error) {
        console.error("Error completing purchase:", error);
        alert("Payment succeeded but order processing failed. Please contact support.");
      }
    },
    onClose: () => {
      console.log("Payment window closed.");
    }
  });

  handler.openIframe();
}

// Complete purchase with billing info
async function completePurchase(user, cartItems, paymentReference) {
  try {
    if (!cartItems || cartItems.length === 0) {
      throw new Error("Your cart is empty");
    }

    // Get billing info
    const billingInfo = await checkBillingInfo(user.uid);
    if (!billingInfo) {
      throw new Error("Billing information not found");
    }

    const orderItems = cartItems.map(item => ({
      productId: item.productId || '',
      name: item.name || 'Unknown Product',
      price: item.price || 0,
      quantity: item.quantity || 1,
      image: item.mainImage || ''
    }));

    const orderTotal = calculateTotal(cartItems);

      // Properly structured order data
      const orderData = {
        userId: user.uid,
        userEmail: user.email || '',
        items: orderItems, // Array of items
        total: orderTotal,
        billingInfo: { // Nested billing info
          fullName: billingInfo.fullName,
          address: billingInfo.address,
          city: billingInfo.city,
          state: billingInfo.state,
          phone: billingInfo.phone
        },
        payment: { // Nested payment info
          method: 'Paystack',
          reference: paymentReference,
          status: 'completed'
        },
        status: 'completed',
        createdAt: serverTimestamp() // Use serverTimestamp, not Date
      };

    // Create the order
    const orderRef = await addDoc(collection(db, "orders"), orderData);

    // Update user's purchase history
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      purchaseHistory: arrayUnion({
        orderId: orderRef.id,
        date: new Date().toISOString(),
        total: orderTotal,
        status: "Completed",
        itemCount: orderItems.length
      }),
      updatedAt: serverTimestamp()
    });

    // Update product quantities
    const batch = writeBatch(db);
    for (const item of orderItems) {
      const productRef = doc(db, "products", item.productId);
      batch.update(productRef, {
        quantity: increment(-item.quantity),
        updatedAt: serverTimestamp()
      });
    }
    await batch.commit();

    // Clear cart
    localStorage.removeItem(`cart_${user.uid}`);

  } catch (error) {
    console.error("Checkout failed:", error);
    throw error;
  }
}

// Helper functions
function getImageSource(item) {
  const possibleImageProps = ['mainImage', 'image', 'img', 'photo', 'thumbnail'];
  for (const prop of possibleImageProps) {
    if (item[prop]) {
      if (typeof item[prop] === 'string' && item[prop].startsWith('data:image')) {
        return item[prop];
      }
      if (isValidUrl(item[prop])) {
        return item[prop];
      }
    }
  }
  return null;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function removeItemFromCart(userId, index) {
  const cart = JSON.parse(localStorage.getItem(`cart_${userId}`)) || [];
  cart.splice(index, 1);
  localStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
  displayCartItems(userId);
}

async function updateProductQuantity(productId, quantitySold) {
  const productRef = doc(db, "products", productId);
  const productDoc = await getDoc(productRef);

  if (productDoc.exists()) {
    const product = productDoc.data();
    const newQuantity = product.quantity - quantitySold;

    if (newQuantity <= 0) {
      await deleteDoc(productRef);
    } else {
      await updateDoc(productRef, { quantity: newQuantity });
    }
  }
}