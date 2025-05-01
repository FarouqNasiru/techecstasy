import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

// Fetch product details
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

async function fetchProductDetails() {
    const productDoc = await getDoc(doc(db, "products", productId));
    if (productDoc.exists()) {
        const product = productDoc.data();
        const additionalImages = product.additionalImages || [];

        // Create the product details HTML
        const productDetails = `
            <div class="product-details-container">
    <div class="swiper-container">
        <div class="swiper-wrapper">
            ${additionalImages.map((image) => `
                <div class="swiper-slide">
                    <img src="${image}" alt="${product.name}">
                </div>
            `).join("")}
        </div>
        <div class="swiper-pagination"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-button-prev"></div>
    </div>

    <!-- CDcare, Category, and Icons -->
    <div class="cdcare-icons-container">
        <div class="cdcare-category">
            <span class="cdcare-text">Tech Ecstasy</span>
            <p class="product-category">${product.category}</p>
           
        </div>
        <div class="product-icons">
            <i class="fas fa-shopping-cart cart-icon" id="add-to-cart-icon"></i>
            <i class="fas fa-heart wishlist-icon" id="add-to-wishlist"></i>
            <i class="fas fa-share-alt share-icon" id="share-product"></i>
        </div>
    </div>
    <br>

    <h1><bold>${product.name}</bold></h1>
    <p class="price">₦${product.price}</p>
    <p class="quantity">Available: ${product.quantity}</p>

    <div class="quantity-controls">
        <button id="decrease-quantity">-</button>
        <span id="quantity">1</span>
        <button id="increase-quantity">+</button>
    </div>

    <!-- Add to Cart Button -->
    <button id="add-to-cart" class="add-to-cart-button">Add to Cart</button>

    <p> More product description <hr></p>
    <p class="description">${product.description}</p>
</div>
        `;

        // Insert the product details into the DOM
        document.getElementById("product-details").innerHTML = productDetails;

        // Initialize Swiper
        setTimeout(() => {
            new Swiper(".swiper-container", {
                loop: true,
                pagination: {
                    el: ".swiper-pagination",
                    clickable: true,
                },
                navigation: {
                    nextEl: ".swiper-button-next",
                    prevEl: ".swiper-button-prev",
                },
            });
        }, 0);

        // Add event listener to the "Add to Cart" button
        document.getElementById("add-to-cart").addEventListener("click", () => {
            const quantity = parseInt(document.getElementById("quantity").textContent, 10);
            addToCart(productId, product.name, product.price, quantity);
        });

        // Add event listeners for quantity controls
        document.getElementById("increase-quantity").addEventListener("click", () => {
            const quantityElement = document.getElementById("quantity");
            let quantity = parseInt(quantityElement.textContent, 10);
            quantityElement.textContent = quantity + 1;
        });

        document.getElementById("decrease-quantity").addEventListener("click", () => {
            const quantityElement = document.getElementById("quantity");
            let quantity = parseInt(quantityElement.textContent, 10);
            if (quantity > 1) {
                quantityElement.textContent = quantity - 1;
            }
        });

        // Add to Wishlist functionality
        document.getElementById("add-to-wishlist").addEventListener("click", () => {
            const user = auth.currentUser;
            if (!user) {
                alert("Please log in to add products to your wishlist.");
                return;
            }

            const wishlistItem = {
                productId,
                name: product.name,
                price: product.price,
                image: product.mainImage,
            };

            // Retrieve existing wishlist or initialize an empty array
            const wishlist = JSON.parse(localStorage.getItem(`wishlist_${user.uid}`)) || [];

            // Check if the product already exists in the wishlist
            const existingItemIndex = wishlist.findIndex((item) => item.productId === productId);
            if (existingItemIndex === -1) {
                // Add new item to the wishlist
                wishlist.push(wishlistItem);
                localStorage.setItem(`wishlist_${user.uid}`, JSON.stringify(wishlist));
                alert("Product added to wishlist!");
            } else {
                alert("Product is already in your wishlist.");
            }
        });

        // Share Product functionality
        document.getElementById("share-product").addEventListener("click", () => {
            const productUrl = window.location.href;
            if (navigator.share) {
                navigator.share({
                    title: product.name,
                    text: `Check out this product: ${product.name}`,
                    url: productUrl,
                })
                .then(() => console.log("Product shared successfully"))
                .catch((error) => console.error("Error sharing product:", error));
            } else {
                // Fallback for browsers that don't support the Web Share API
                navigator.clipboard.writeText(productUrl)
                    .then(() => alert("Product link copied to clipboard!"))
                    .catch((error) => console.error("Error copying link:", error));
            }
        });
    } else {
        document.getElementById("product-details").innerHTML = "<p>Product not found.</p>";
    }
}

// Add to Cart functionality
function addToCart(productId, name, price, quantity) {
  const user = auth.currentUser;
  if (!user) {
      alert("Please log in to add products to your cart.");
      return;
  }

  // Get the product image from the current page
  const productImage = document.querySelector('.swiper-slide img')?.src || 
                      document.querySelector('.product-details-container img')?.src;

  const cartItem = {
      productId,
      name,
      price,
      quantity,
      image: productImage, // Add the image URL/Base64 to cart item
      mainImage: productImage // Include as both image and mainImage for compatibility
  };

  // Retrieve existing cart or initialize an empty array
  const cart = JSON.parse(localStorage.getItem(`cart_${user.uid}`)) || [];

  // Check if the product already exists in the cart
  const existingItemIndex = cart.findIndex((item) => item.productId === productId);
  if (existingItemIndex !== -1) {
      // Update quantity if the product already exists
      cart[existingItemIndex].quantity += quantity;
  } else {
      // Add new item to the cart
      cart.push(cartItem);
  }

  // Save updated cart to localStorage
  localStorage.setItem(`cart_${user.uid}`, JSON.stringify(cart));
  
  
  // Log the cart for debugging
  console.log("Cart updated:", cart);

  alert("Product added to cart!");
}

// Check if user is authenticated
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        fetchProductDetails();
    }
});