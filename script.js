import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

window.allProducts = []; // Store all products globally for filtering

// Check if user is authenticated
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html"; // Redirect to login if not authenticated
  } else {
    // User is authenticated, display profile picture
    const profilePicture = document.getElementById("profile-picture");
    profilePicture.src = user.photoURL || "https://via.placeholder.com/40";
    profilePicture.classList.remove("hidden");

    // Fetch and display products
    fetchProducts();
    
    // Set up category click handlers
    setupCategoryFilters();
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

// Fetch products from Firestore
async function fetchProducts() {
  const productsGrid = document.getElementById("products-grid");
  productsGrid.innerHTML = '<div class="loading">Loading products...</div>'; // Show loading state

  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    window.allProducts = []; // Reset the array
    querySnapshot.forEach((doc) => {
      const product = doc.data();
      product.id = doc.id; // Add the document ID to the product object
      if (product.quantity > 0) { // Only display products with available quantity
        window.allProducts.push(product);
      }
    });

    // Display all products initially
    displayProducts(window.allProducts);

    // Add event listener to the search bar
    document.getElementById("search-input").addEventListener("input", (event) => {
      const searchTerm = event.target.value.toLowerCase();
      const filteredProducts = window.allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        (product.category && product.category.toLowerCase().includes(searchTerm))
      );
      displayProducts(filteredProducts);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    productsGrid.innerHTML = '<div class="error">Error loading products. Please try again.</div>';
  }
}

// Set up category click handlers
function setupCategoryFilters() {
  const categoryElements = document.querySelectorAll('.category');
  categoryElements.forEach(category => {
    category.addEventListener('click', () => {
      const categoryName = category.textContent.trim();
      filterProductsByCategory(categoryName);
    });
  });
}

// Filter products by category
function filterProductsByCategory(categories) {
  const filteredProducts = allProducts.filter((product) =>
    product.category && categories.includes(product.category.trim().toUpperCase())
  );
  displayProducts(filteredProducts);

  
  // Update UI to show active filter
  document.querySelectorAll('.category').forEach(cat => {
    if (cat.textContent.trim().toUpperCase() === categoryName.toUpperCase()) {
      cat.classList.add('active-category');
    } else {
      cat.classList.remove('active-category');
    }
  });
}

// Function to display products
function displayProducts(products) {
  const productsGrid = document.getElementById("products-grid");
  
  if (products.length === 0) {
    productsGrid.innerHTML = '<div class="no-products">No products found matching your criteria.</div>';
    return;
  }

  productsGrid.innerHTML = ""; // Clear existing content

  products.forEach((product) => {
    const productCard = `
      <div class="product-card" data-category="${product.category}">
        <img src="${product.mainImage}" alt="${product.name}" data-product-id="${product.id}">
        <h3>${product.name}</h3>
        <div class="price-wishlist">
          <p>₦${product.price}</p>
          <i class="fas fa-heart wishlist-icon" data-product-id="${product.id}"></i>
        </div>
      </div>
    `;
    productsGrid.innerHTML += productCard;
  });

  // Add event listeners to wishlist icons
  setupWishlistListeners();
  
  // Add event listeners to product images
  setupProductClickListeners();
}

// Setup wishlist listeners
function setupWishlistListeners() {
  const wishlistIcons = document.querySelectorAll(".wishlist-icon");
  wishlistIcons.forEach((icon) => {
    icon.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent triggering product click
      const productId = icon.getAttribute("data-product-id");
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to add products to your wish-list.");
        return;
      }

      try {
        const productDoc = await getDoc(doc(db, "products", productId));
        if (productDoc.exists()) {
          const product = productDoc.data();
          const wishListItem = {
            productId,
            name: product.name,
            price: product.price,
            image: product.mainImage,
          };

          // Save wish-list item to localStorage
          const wishList = JSON.parse(localStorage.getItem(`wishList_${user.uid}`)) || [];
          const existingIndex = wishList.findIndex(item => item.productId === productId);
          
          if (existingIndex >= 0) {
            wishList.splice(existingIndex, 1); // Remove if already in wishlist
            icon.classList.remove('active');
            alert("Product removed from wish-list!");
          } else {
            wishList.push(wishListItem);
            icon.classList.add('active');
            alert("Product added to wish-list!");
          }
          
          localStorage.setItem(`wishList_${user.uid}`, JSON.stringify(wishList));
        }
      } catch (error) {
        console.error("Error handling wishlist:", error);
      }
    });
  });
}

// Setup product click listeners
function setupProductClickListeners() {
  const productImages = document.querySelectorAll(".product-card img");
  productImages.forEach((image) => {
    image.addEventListener("click", () => {
      const productId = image.getAttribute("data-product-id");
      window.location.href = `product.html?id=${productId}`;
    });
  });
}

// Function to update product quantity after a sale
async function updateProductQuantity(productId, quantitySold) {
  const productRef = doc(db, "products", productId);
  const productDoc = await getDoc(productRef);

  if (productDoc.exists()) {
    const product = productDoc.data();
    const newQuantity = product.quantity - quantitySold;

    if (newQuantity <= 0) {
      // Remove product from Firestore if sold out
      await deleteDoc(productRef);
    } else {
      // Update product quantity
      await updateDoc(productRef, { quantity: newQuantity });
    }
  }
}


