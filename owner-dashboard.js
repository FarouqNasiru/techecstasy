import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { 
  orderBy, 
  limit,
  doc,
  getDoc
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


// Owner's email address
const OWNER_EMAIL = "humbledare5@gmail.com"; // Replace with the owner's email

// Check if user is authenticated and is the owner
onAuthStateChanged(auth, (user) => {
  if (!user || user.email !== OWNER_EMAIL) {
    window.location.href = "login.html"; // Redirect to login page if not the owner
  }

  // Load orders
  loadOrders();


});




// Load and display orders
async function loadOrders() {
  const ordersList = document.getElementById("orders-list");
  ordersList.innerHTML = "<p>Loading orders...</p>";
  
  try {
    const q = query(
      collection(db, "orders"), 
      orderBy("createdAt", "desc"), 
      limit(20)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      ordersList.innerHTML = "<p>No orders found</p>";
      return;
    }
    
    ordersList.innerHTML = "";
    
    querySnapshot.forEach((doc) => {
      const order = doc.data();
      const orderDate = order.createdAt?.toDate().toLocaleString() || "Unknown date";
      
      const orderCard = document.createElement("div");
      orderCard.className = "order-card";
      orderCard.innerHTML = `
        <div class="order-header">
          <h3>Order #${doc.id}</h3>
          <span class="status-badge status-${order.status || 'pending'}">
            ${order.status || 'pending'}
          </span>
        </div>
        <p><strong>Customer:</strong> ${order.userEmail || 'No email'}</p>
        <p><strong>Date:</strong> ${orderDate}</p>
        <p><strong>Total:</strong> ₦${order.total?.toFixed(2) || '0.00'}</p>
        
        <div class="order-items">
          <h4>Items:</h4>
          ${order.items?.map(item => `
            <div class="order-item">
              <span>${item.name} (${item.quantity})</span>
              <span>₦${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          `).join('') || 'No items'}
        </div>
        
        <div class="billing-info">
          <h4>Billing Information:</h4>
          <p><strong>Name:</strong> ${order.billingInfo?.fullName || 'Not provided'}</p>
          <p><strong>Address:</strong> ${order.billingInfo?.address || 'Not provided'}</p>
          <p><strong>City:</strong> ${order.billingInfo?.city || 'Not provided'}</p>
          <p><strong>State:</strong> ${order.billingInfo?.state || 'Not provided'}</p>
          <p><strong>Phone:</strong> ${order.billingInfo?.phone || 'Not provided'}</p>
        </div>
        
        <div class="payment-info">
          <h4>Payment:</h4>
          <p><strong>Method:</strong> ${order.payment?.method || 'Unknown'}</p>
          <p><strong>Reference:</strong> ${order.payment?.reference || 'None'}</p>
          <p><strong>Status:</strong> ${order.payment?.status || 'Unknown'}</p>
        </div>
      `;
      
      ordersList.appendChild(orderCard);
    });
    
  } catch (error) {
    console.error("Error loading orders:", error);
    ordersList.innerHTML = `<p>Error loading orders: ${error.message}</p>`;
  }
}




// Function to compress and convert image to base64
async function compressAndConvertImage(file) {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.6, // Adjust quality (0.6 = 60% quality)
      success(result) {
        const reader = new FileReader();
        reader.readAsDataURL(result);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      },
      error(err) {
        reject(err);
      },
    });
  });
}

// Add product to Firestore
document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("product-name").value;
  const price = parseFloat(document.getElementById("product-price").value);
  const mainImageFile = document.getElementById("main-image").files[0];
  const description = document.getElementById("product-description").value;
  const quantity = parseInt(document.getElementById("product-quantity").value);
  const category = document.getElementById("product-category").value; // Get selected category
  const additionalImagesFiles = document.getElementById("additional-images").files;

  if (!mainImageFile || !additionalImagesFiles || additionalImagesFiles.length === 0) {
    alert("Please upload the main image and at least one additional image.");
    return;
  }

  try {
    // Convert main image to base64
    const mainImageBase64 = await compressAndConvertImage(mainImageFile);

    // Compress and convert additional images to base64
    const additionalImages = [];
    for (let i = 0; i < additionalImagesFiles.length; i++) {
      const base64 = await compressAndConvertImage(additionalImagesFiles[i]);
      additionalImages.push(base64);
    }

    // Add product to Firestore
    await addDoc(collection(db, "products"), {
      name,
      price,
      mainImage: mainImageBase64, // Store main image as base64 string
      additionalImages, // Store additional images as base64 strings
      description,
      quantity, // Store available quantity
      category, // Store selected category
    });

    alert("Product added successfully!");
    document.getElementById("product-form").reset();
  } catch (error) {
    console.error("Error adding product:", error);
    alert("Failed to add product. Please try again.");
  }
});


// Logout button
document.getElementById("logout-button").addEventListener("click", () => {
  signOut(auth)
    .then(() => {
      window.location.href = "login.html";
    })
    .catch((error) => {
      console.error("Logout failed:", error);
    });
});