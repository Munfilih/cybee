// Global variables
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let currentUser = null;
let allProducts = [];

// Authentication state observer
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        updateNavForLoggedInUser(user);
    } else {
        updateNavForLoggedOutUser();
    }
    updateCartDisplay();
});

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadOffers();
    loadHomeProducts();
    loadHomeOffers();
    updateCartDisplay();
    loadBackgroundImage();
    setupRealTimeUpdates();
    loadDefaults();
    // Add sample data if collections are empty
    setTimeout(addSampleData, 2000);
});

// Load all site settings
async function loadBackgroundImage() {
    try {
        const doc = await db.collection('settings').doc('site').get();
        if (doc.exists) {
            const settings = doc.data();
            applySettings(settings);
        }
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Apply settings to page elements
function applySettings(settings) {
    // Apply all text and styling settings
    Object.keys(settings).forEach(key => {
        if (key === 'updatedAt') return;
        
        const element = document.querySelector(`[data-field="${key}"]`);
        if (element) {
            if (element.classList.contains('editable-text')) {
                element.textContent = settings[key];
                // Apply text styling if exists
                if (settings[`${key}_color`]) element.style.color = settings[`${key}_color`];
                if (settings[`${key}_fontSize`]) element.style.fontSize = settings[`${key}_fontSize`];
                if (settings[`${key}_fontWeight`]) element.style.fontWeight = settings[`${key}_fontWeight`];
            } else if (element.classList.contains('editable-image')) {
                element.src = settings[key];
            } else if (element.classList.contains('editable-background')) {
                element.style.backgroundImage = `url(${settings[key]})`;
                element.style.backgroundSize = 'cover';
                element.style.backgroundPosition = 'center';
            } else if (element.classList.contains('editable-icon')) {
                element.className = `editable-icon ${settings[key]}`;
            }
        }
    });
}

// Listen for real-time updates
function setupRealTimeUpdates() {
    db.collection('settings').doc('site').onSnapshot((doc) => {
        if (doc.exists) {
            const settings = doc.data();
            applySettings(settings);
        }
    });
}

// Navigation functions
function updateNavForLoggedInUser(user) {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBtn = document.getElementById('adminBtn');
    
    loginBtn.innerHTML = `<i class="fas fa-user"></i> ${user.displayName || 'Profile'}`;
    loginBtn.onclick = () => showProfile();
    
    logoutBtn.style.display = 'block';
    
    if (user.email === 'admin@cybee.com') {
        adminBtn.style.display = 'block';
    }
}

function updateNavForLoggedOutUser() {
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBtn = document.getElementById('adminBtn');
    
    loginBtn.innerHTML = 'Login';
    loginBtn.onclick = () => showLogin();
    
    logoutBtn.style.display = 'none';
    adminBtn.style.display = 'none';
}

// Modal functions
function showLogin() {
    document.getElementById('loginModal').style.display = 'block';
}

function showSignup() {
    document.getElementById('signupModal').style.display = 'block';
}

function showProfile() {
    if (!currentUser) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <div class="modal-header">
                <h2>User Profile</h2>
            </div>
            <div style="padding: 2rem;">
                <p><strong>Name:</strong> ${currentUser.displayName || 'Not set'}</p>
                <p><strong>Email:</strong> ${currentUser.email}</p>
                <p><strong>Account Created:</strong> ${currentUser.metadata.creationTime}</p>
                <p><strong>Last Sign In:</strong> ${currentUser.metadata.lastSignInTime}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    if (!currentUser) {
        showNotification('Please login to checkout', 'error');
        showLogin();
        return;
    }
    populateCheckout();
    document.getElementById('checkoutModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function switchModal(targetModal) {
    document.querySelectorAll('.modal').forEach(modal => modal.style.display = 'none');
    document.getElementById(targetModal).style.display = 'block';
}

// Authentication functions
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Check if admin credentials
        if (email === 'admin@cybee.com') {
            window.location.href = 'admin.html';
        } else {
            closeModal('loginModal');
            document.getElementById('loginForm').reset();
        }
    } catch (error) {
        showError('loginError', 'Login failed: ' + error.message);
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile with name
        await userCredential.user.updateProfile({
            displayName: name
        });
        
        // Save user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            role: 'user'
        });
        
        closeModal('signupModal');
        document.getElementById('signupForm').reset();
    } catch (error) {
        showError('signupError', 'Signup failed: ' + error.message);
    }
});

function logout() {
    auth.signOut().then(() => {
        cart = [];
        localStorage.removeItem('cart');
        updateCartDisplay();
        location.reload();
    });
}

// Load products from Firestore
async function loadProducts() {
    try {
        const snapshot = await db.collection('products').get();
        allProducts = [];
        const productsContainer = document.getElementById('products-container');
        productsContainer.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            allProducts.push(product);
            const productCard = createProductCard(product);
            productsContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load offers from Firestore
async function loadOffers() {
    try {
        const snapshot = await db.collection('offers').get();
        const offersContainer = document.getElementById('offers-container');
        offersContainer.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const offer = doc.data();
            const offerCard = createOfferCard(offer);
            offersContainer.appendChild(offerCard);
        });
    } catch (error) {
        console.error('Error loading offers:', error);
    }
}

// Load offers for home page
async function loadHomeOffers() {
    try {
        const snapshot = await db.collection('offers').limit(3).get();
        const homeOffersContainer = document.getElementById('home-offers-container');
        homeOffersContainer.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const offer = doc.data();
            const offerCard = createOfferCard(offer);
            homeOffersContainer.appendChild(offerCard);
        });
    } catch (error) {
        console.error('Error loading home offers:', error);
    }
}

// Load products for home page
async function loadHomeProducts() {
    try {
        const snapshot = await db.collection('products').limit(6).get();
        const homeProductsContainer = document.getElementById('home-products-container');
        homeProductsContainer.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const product = { id: doc.id, ...doc.data() };
            const productCard = createProductCard(product);
            homeProductsContainer.appendChild(productCard);
        });
    } catch (error) {
        console.error('Error loading home products:', error);
    }
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const mainImage = product.images && product.images.length > 0 ? product.images[0] : product.image || 'https://via.placeholder.com/300x200';
    
    let priceHTML = '';
    if (product.discount && product.discount > 0) {
        priceHTML = `
            <p class="price">
                <span style="text-decoration: line-through; color: #999; font-size: 0.9rem;">₹${product.price}</span>
                <span style="color: #dc3545; font-weight: bold;">₹${product.finalPrice}</span>
                <span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8rem; margin-left: 5px;">${product.discount}% OFF</span>
            </p>
        `;
    } else {
        priceHTML = `<p class="price">₹${product.price}</p>`;
    }
    
    card.innerHTML = `
        <img src="${mainImage}" alt="${product.name}">
        <div class="product-info">
            <h4>${product.name}</h4>
            <p>${product.description}</p>
            ${priceHTML}
            <p style="color: #666; font-size: 0.9rem;">Stock: ${product.stock}</p>
            <div class="product-actions">
                <button class="btn-cart" onclick="addToCart('${product.id}')">Add to Cart</button>
                <button class="btn-wishlist"><i class="fas fa-heart"></i></button>
            </div>
        </div>
    `;
    return card;
}

// Create offer card element
function createOfferCard(offer) {
    const card = document.createElement('div');
    card.className = 'offer-card';
    card.innerHTML = `
        <img src="${offer.image}" alt="${offer.title}">
        <div class="offer-info">
            <h4>${offer.title}</h4>
            <p>${offer.description}</p>
            <p class="price">${offer.discount}% OFF</p>
        </div>
    `;
    return card;
}

// Shopping Cart Functions
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showNotification('Product out of stock', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showNotification('Cannot add more items than available stock', 'error');
            return;
        }
        existingItem.quantity += 1;
    } else {
        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.finalPrice || product.price,
            image: product.images && product.images[0] ? product.images[0] : product.image,
            quantity: 1
        };
        cart.push(cartItem);
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showNotification('Product added to cart!', 'success');
    
    // Visual feedback on button
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Added!';
    button.style.background = '#28a745';
    setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '#007bff';
    }, 1500);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartDisplay();
        }
    }
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    cartCount.textContent = totalItems;
    cartTotal.textContent = totalPrice.toFixed(2);
    
    cartItems.innerHTML = '';
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <h5>${item.name}</h5>
                <div class="cart-item-price">₹${item.price}</div>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                    <button onclick="removeFromCart('${item.id}')" style="margin-left: 1rem; color: #e74c3c;">Remove</button>
                </div>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
}

function toggleCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    cartSidebar.classList.toggle('open');
}

// Search and Filter Functions
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    displayProducts(filteredProducts);
}

function filterProducts(category) {
    setTimeout(() => {
        if (category === 'all') {
            displayProducts(allProducts);
        } else {
            const filteredProducts = allProducts.filter(product => 
                product.category && product.category.toLowerCase() === category
            );
            displayProducts(filteredProducts);
        }
    }, 100);
}

function sortProducts() {
    const sortBy = document.getElementById('sortSelect').value;
    let sortedProducts = [...allProducts];
    
    switch(sortBy) {
        case 'name':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price-low':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
    }
    
    displayProducts(sortedProducts);
}

function displayProducts(products) {
    const productsContainer = document.getElementById('products-container');
    productsContainer.innerHTML = '';
    
    products.forEach(product => {
        const productCard = createProductCard(product);
        productsContainer.appendChild(productCard);
    });
}

// Checkout Functions
function populateCheckout() {
    const checkoutItems = document.getElementById('checkoutItems');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    checkoutTotal.textContent = totalPrice.toFixed(2);
    
    checkoutItems.innerHTML = '';
    cart.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span>${item.name} x ${item.quantity}</span>
                <span>₹${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
        checkoutItems.appendChild(itemDiv);
    });
}

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please login to place an order');
        return;
    }
    
    const orderData = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        shippingInfo: {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            address: document.getElementById('address').value,
            city: document.getElementById('city').value,
            zipCode: document.getElementById('zipCode').value
        },
        paymentMethod: document.querySelector('input[name="payment"]:checked').value,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('orders').add(orderData);
        
        // Clear cart
        cart = [];
        localStorage.removeItem('cart');
        updateCartDisplay();
        
        closeModal('checkoutModal');
        toggleCart();
        showNotification('Order placed successfully!', 'success');
        
        document.getElementById('checkoutForm').reset();
    } catch (error) {
        showNotification('Error placing order: ' + error.message, 'error');
    }
});

// Tab navigation
function showTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#main-content .tab-content').forEach(content => content.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// Profile Functions
function showProfileTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#profileModal .tab-content').forEach(content => content.classList.remove('active'));
    
    if (event && event.target) {
        event.target.classList.add('active');
    }
    const targetTab = document.getElementById(tabName + 'Tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

async function loadUserOrders() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('orders')
            .where('userId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        const userOrders = document.getElementById('userOrders');
        userOrders.innerHTML = '';
        
        if (snapshot.empty) {
            userOrders.innerHTML = '<p>No orders found.</p>';
            return;
        }
        
        snapshot.forEach(doc => {
            const order = doc.data();
            const orderDiv = document.createElement('div');
            orderDiv.className = 'order-item';
            orderDiv.style.cssText = 'border: 1px solid #eee; padding: 1rem; margin-bottom: 1rem; border-radius: 5px;';
            
            orderDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <strong>Order #${doc.id.substring(0, 8)}</strong>
                    <span class="status" style="color: #3498db;">${order.status}</span>
                </div>
                <div>Total: ₹${order.total.toFixed(2)}</div>
                <div style="font-size: 0.9rem; color: #666;">
                    ${order.items.length} items • ${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'Recent'}
                </div>
            `;
            userOrders.appendChild(orderDiv);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    const name = document.getElementById('profileName').value;
    
    try {
        await currentUser.updateProfile({ displayName: name });
        await db.collection('users').doc(currentUser.uid).update({ name });
        
        updateNavForLoggedInUser(currentUser);
        showNotification('Profile updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating profile: ' + error.message, 'error');
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close cart when clicking outside
    const cartSidebar = document.getElementById('cartSidebar');
    if (!cartSidebar.contains(event.target) && !event.target.closest('.cart-btn')) {
        cartSidebar.classList.remove('open');
    }
};

// Notification functions
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Add sample data if collections are empty
async function addSampleData() {
    try {
        // Check if products exist
        const productsSnapshot = await db.collection('products').limit(1).get();
        if (productsSnapshot.empty) {
            await db.collection('products').add({
                name: "Gaming Laptop",
                description: "High-performance gaming laptop with RTX graphics",
                price: 1299.99,
                image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400",
                stock: 15,
                category: "laptops",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection('products').add({
                name: "iPhone 15 Pro",
                description: "Latest iPhone with advanced camera system",
                price: 999.99,
                image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400",
                stock: 25,
                category: "phones",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection('products').add({
                name: "Wireless Headphones",
                description: "Premium noise-canceling wireless headphones",
                price: 299.99,
                image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                stock: 30,
                category: "accessories",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            loadProducts();
        }
        
        // Check if offers exist
        const offersSnapshot = await db.collection('offers').limit(1).get();
        if (offersSnapshot.empty) {
            await db.collection('offers').add({
                title: "Black Friday Sale",
                description: "Up to 50% off on all electronics",
                discount: 50,
                image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            await db.collection('offers').add({
                title: "New Year Special",
                description: "Start the year with new tech",
                discount: 30,
                image: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            loadOffers();
        }
    } catch (error) {
        console.error('Error adding sample data:', error);
    }
}

// Search on Enter key
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchProducts();
    }
});

// Edit mode functionality
let isEditMode = false;

// Toggle edit mode
function toggleEditMode() {
    if (!currentUser || currentUser.email !== 'admin@cybee.com') return;
    
    isEditMode = !isEditMode;
    const btn = document.getElementById('editModeBtn');
    
    if (isEditMode) {
        document.body.classList.add('edit-mode');
        btn.textContent = 'Edit Mode: ON';
        btn.classList.add('active');
        enableEditFeatures();
    } else {
        document.body.classList.remove('edit-mode');
        btn.textContent = 'Edit Mode: OFF';
        btn.classList.remove('active');
        disableEditFeatures();
    }
}

// Enable edit features
function enableEditFeatures() {
    // Add right-click listeners for existing editable elements
    document.querySelectorAll('.editable-text').forEach(element => {
        element.addEventListener('contextmenu', handleTextRightClick);
    });
    
    document.querySelectorAll('.editable-container, .editable-image, .editable-background, .editable-icon').forEach(element => {
        element.addEventListener('contextmenu', handleRightClick);
    });
    
    // Disable all links in edit mode
    document.querySelectorAll('a, button').forEach(element => {
        element.style.pointerEvents = 'none';
    });
}



// Disable edit features
function disableEditFeatures() {
    // Remove right-click listeners for text
    document.querySelectorAll('.editable-text').forEach(element => {
        element.removeEventListener('contextmenu', handleTextRightClick);
    });
    
    // Remove right-click listeners for containers and images
    document.querySelectorAll('.editable-container, .editable-image, .editable-background, .editable-icon').forEach(element => {
        element.removeEventListener('contextmenu', handleRightClick);
    });
    
    // Re-enable all links
    document.querySelectorAll('a, button').forEach(element => {
        element.style.pointerEvents = 'auto';
    });
}

// Handle right-click for text elements
function handleTextRightClick(e) {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const field = e.target.dataset.field;
    const currentValue = e.target.textContent;
    
    showStandardEditModal(field, currentValue, e.target);
}

// Show standard edit modal for text
function showStandardEditModal(field, currentValue, element) {
    const modal = document.getElementById('editModal');
    const title = document.getElementById('editModalTitle');
    const content = document.getElementById('editContent');
    const fieldInput = document.getElementById('editField');
    
    fieldInput.value = field;
    title.textContent = 'Edit Text Content';
    
    const computedStyle = getComputedStyle(element);
    
    content.innerHTML = `
        <div class="form-group">
            <label for="editValue">Text Content</label>
            <input type="text" id="editValue" value="${currentValue}" placeholder="Enter text content" required>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group">
                <label for="textColor">Text Color</label>
                <input type="color" id="textColor" value="#000000">
            </div>
            <div class="form-group">
                <label for="bgColor">Background Color</label>
                <input type="color" id="bgColor" value="#ffffff">
            </div>
            <div class="form-group">
                <label for="fontSize">Font Size (px)</label>
                <input type="number" id="fontSize" value="16" min="8" max="100">
            </div>
            <div class="form-group">
                <label for="fontWeight">Font Weight</label>
                <select id="fontWeight">
                    <option value="300">Light</option>
                    <option value="400" selected>Normal</option>
                    <option value="500">Medium</option>
                    <option value="600">Semi Bold</option>
                    <option value="700">Bold</option>
                </select>
            </div>
            <div class="form-group">
                <label for="hoverColor">Hover Text Color</label>
                <input type="color" id="hoverColor" value="#007bff">
            </div>
            <div class="form-group">
                <label for="hoverBgColor">Hover Background</label>
                <input type="color" id="hoverBgColor" value="#f8f9fa">
            </div>
            <div class="form-group">
                <label for="transition">Transition (seconds)</label>
                <input type="number" id="transition" value="0.3" min="0" max="2" step="0.1">
            </div>
            <div class="form-group">
                <label for="borderRadius">Border Radius (px)</label>
                <input type="number" id="borderRadius" value="0" min="0" max="50">
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
    
    // Override form submission for text editing
    const form = document.getElementById('editForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const newText = document.getElementById('editValue').value;
        const color = document.getElementById('textColor').value;
        const bgColor = document.getElementById('bgColor').value;
        const fontSize = document.getElementById('fontSize').value + 'px';
        const fontWeight = document.getElementById('fontWeight').value;
        const hoverColor = document.getElementById('hoverColor').value;
        const hoverBgColor = document.getElementById('hoverBgColor').value;
        const transition = document.getElementById('transition').value + 's';
        const borderRadius = document.getElementById('borderRadius').value + 'px';
        
        // Apply changes immediately
        element.textContent = newText;
        element.style.color = color;
        element.style.backgroundColor = bgColor;
        element.style.fontSize = fontSize;
        element.style.fontWeight = fontWeight;
        element.style.transition = `all ${transition}`;
        element.style.borderRadius = borderRadius;
        
        // Add hover effects
        const uniqueClass = `hover-${field}-${Date.now()}`;
        element.classList.add(uniqueClass);
        
        // Create hover CSS
        const style = document.createElement('style');
        style.textContent = `
            .${uniqueClass}:hover {
                color: ${hoverColor} !important;
                background-color: ${hoverBgColor} !important;
            }
        `;
        document.head.appendChild(style);
        
        try {
            await db.collection('settings').doc('site').set({
                [field]: newText,
                [`${field}_color`]: color,
                [`${field}_bgColor`]: bgColor,
                [`${field}_fontSize`]: fontSize,
                [`${field}_fontWeight`]: fontWeight,
                [`${field}_hoverColor`]: hoverColor,
                [`${field}_hoverBgColor`]: hoverBgColor,
                [`${field}_transition`]: transition,
                [`${field}_borderRadius`]: borderRadius,
                [`${field}_hoverClass`]: uniqueClass,
                updatedAt: new Date()
            }, { merge: true });
            
            closeEditModal();
            showNotification('Text updated successfully!', 'success');
        } catch (error) {
            showNotification('Error updating text: ' + error.message, 'error');
        }
        
        // Restore original form handler
        form.onsubmit = null;
    };
}



// Load defaults on page load
async function loadDefaults() {
    try {
        const doc = await db.collection('settings').doc('site').get();
        if (doc.exists) {
            const defaults = doc.data();
            // Update HTML elements with saved values
            Object.keys(defaults).forEach(key => {
                if (key === 'updatedAt') return;
                const element = document.querySelector(`[data-field="${key}"]`);
                if (element) {
                    if (element.classList.contains('editable-text')) {
                        element.textContent = defaults[key];
                        // Apply text styling if exists
                        if (defaults[`${key}_color`]) element.style.color = defaults[`${key}_color`];
                        if (defaults[`${key}_bgColor`]) element.style.backgroundColor = defaults[`${key}_bgColor`];
                        if (defaults[`${key}_fontSize`]) element.style.fontSize = defaults[`${key}_fontSize`];
                        if (defaults[`${key}_fontWeight`]) element.style.fontWeight = defaults[`${key}_fontWeight`];
                        if (defaults[`${key}_transition`]) element.style.transition = `all ${defaults[`${key}_transition`]}`;
                        if (defaults[`${key}_borderRadius`]) element.style.borderRadius = defaults[`${key}_borderRadius`];
                        
                        // Apply hover effects
                        if (defaults[`${key}_hoverClass`]) {
                            element.classList.add(defaults[`${key}_hoverClass`]);
                            const style = document.createElement('style');
                            style.textContent = `
                                .${defaults[`${key}_hoverClass`]}:hover {
                                    color: ${defaults[`${key}_hoverColor`]} !important;
                                    background-color: ${defaults[`${key}_hoverBgColor`]} !important;
                                }
                            `;
                            document.head.appendChild(style);
                        }
                    } else if (element.classList.contains('editable-image')) {
                        element.src = defaults[key];
                        // Apply image styling
                        if (defaults[`${key}_width`]) element.style.width = defaults[`${key}_width`];
                        element.style.height = 'auto';
                        if (defaults[`${key}_positionX`] || defaults[`${key}_positionY`]) {
                            element.style.objectPosition = `${defaults[`${key}_positionX`] || 'center'} ${defaults[`${key}_positionY`] || 'center'}`;
                        }
                    } else if (element.classList.contains('editable-background')) {
                        element.style.backgroundImage = `url(${defaults[key]})`;
                        element.style.backgroundSize = 'cover';
                        element.style.backgroundPosition = 'center';
                    } else if (element.classList.contains('editable-icon')) {
                        element.className = `editable-icon ${defaults[key]}`;
                    }
                }
            });
        }
        
        // Set default hero image if not set
        const heroImage = document.querySelector('[data-field="heroImage"]');
        if (heroImage && !heroImage.src) {
            heroImage.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
        }
    } catch (error) {
        console.error('Error loading defaults:', error);
        // Set default hero image on error
        const heroImage = document.querySelector('[data-field="heroImage"]');
        if (heroImage && !heroImage.src) {
            heroImage.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800';
        }
    }
}

// Handle right-click for containers and images
function handleRightClick(e) {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const field = e.target.dataset.field;
    const currentValue = getElementValue(e.target);
    
    if (e.target.classList.contains('editable-container')) {
        showContainerEditModal(field, e.target);
    } else if (e.target.classList.contains('editable-image')) {
        showEditModal(field, currentValue, e.target);
    }
}

// Show container edit modal
function showContainerEditModal(field, element) {
    const modal = document.getElementById('editModal');
    const title = document.getElementById('editModalTitle');
    const content = document.getElementById('editContent');
    const fieldInput = document.getElementById('editField');
    
    fieldInput.value = field;
    title.textContent = 'Edit Container';
    
    const currentBg = element.style.backgroundColor || '';
    const currentBorder = element.style.border || '';
    const currentPadding = element.style.padding || '';
    const currentMargin = element.style.margin || '';
    
    content.innerHTML = `
        <div class="form-group">
            <label>Background Color</label>
            <input type="color" id="bgColor" value="${currentBg}">
            <input type="text" id="bgColorText" value="${currentBg}" placeholder="#ffffff or transparent">
        </div>
        <div class="form-group">
            <label>Border</label>
            <input type="text" id="borderStyle" value="${currentBorder}" placeholder="1px solid #ccc">
        </div>
        <div class="form-group">
            <label>Padding</label>
            <input type="text" id="paddingStyle" value="${currentPadding}" placeholder="10px">
        </div>
        <div class="form-group">
            <label>Margin</label>
            <input type="text" id="marginStyle" value="${currentMargin}" placeholder="10px">
        </div>
        <div class="form-group">
            <label>Background Image</label>
            <input type="url" id="bgImage" placeholder="Background image URL">
        </div>
    `;
    
    // Update text input when color picker changes
    document.getElementById('bgColor').addEventListener('input', (e) => {
        document.getElementById('bgColorText').value = e.target.value;
    });
    
    modal.style.display = 'block';
    
    // Override form submission for container editing
    const form = document.getElementById('editForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const bgColor = document.getElementById('bgColorText').value;
        const border = document.getElementById('borderStyle').value;
        const padding = document.getElementById('paddingStyle').value;
        const margin = document.getElementById('marginStyle').value;
        const bgImage = document.getElementById('bgImage').value;
        
        // Apply styles immediately
        if (bgColor) element.style.backgroundColor = bgColor;
        if (border) element.style.border = border;
        if (padding) element.style.padding = padding;
        if (margin) element.style.margin = margin;
        if (bgImage) {
            element.style.backgroundImage = `url(${bgImage})`;
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
        }
        
        try {
            await db.collection('settings').doc('containers').set({
                [field]: {
                    backgroundColor: bgColor,
                    border: border,
                    padding: padding,
                    margin: margin,
                    backgroundImage: bgImage
                },
                updatedAt: new Date()
            }, { merge: true });
            
            closeEditModal();
            showNotification('Container updated successfully!', 'success');
        } catch (error) {
            showNotification('Error updating container: ' + error.message, 'error');
        }
        
        // Restore original form handler
        form.onsubmit = null;
    };
}



// Get current value of element
function getElementValue(element) {
    if (element.classList.contains('editable-text')) {
        return element.textContent;
    } else if (element.classList.contains('editable-image')) {
        return element.src;
    } else if (element.classList.contains('editable-background')) {
        const bg = element.style.backgroundImage;
        return bg ? bg.slice(5, -2) : '';
    } else if (element.classList.contains('editable-icon')) {
        return element.className.replace('editable-icon ', '');
    }
    return '';
}

// Show edit modal
function showEditModal(field, currentValue, element) {
    const modal = document.getElementById('editModal');
    const title = document.getElementById('editModalTitle');
    const content = document.getElementById('editContent');
    const fieldInput = document.getElementById('editField');
    
    fieldInput.value = field;
    
    if (element.classList.contains('editable-image') || element.classList.contains('editable-background')) {
        title.textContent = 'Edit Image';
        content.innerHTML = `
            <div class="form-group">
                <label>Image URL</label>
                <input type="url" id="editValue" value="${currentValue}" placeholder="Enter image URL">
            </div>
            <div class="form-group">
                <label>Or Upload Image File</label>
                <input type="file" id="editFile" accept="image/*">
                <small style="color: #666; display: block; margin-top: 5px;">
                    File will be converted and stored in database
                </small>
            </div>
            <div class="form-group">
                <label>Image Size & Position</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label>Width (px)</label>
                        <input type="number" id="imageWidth" placeholder="Auto" min="50" max="1000">
                    </div>
                    <div>
                        <label>Height</label>
                        <input type="text" id="imageHeight" value="Auto (Aspect Ratio)" readonly style="background: #f5f5f5;">
                        <small style="color: #666;">Height locked to maintain aspect ratio</small>
                    </div>
                    <div>
                        <label>Position X</label>
                        <select id="imagePositionX">
                            <option value="left">Left</option>
                            <option value="center" selected>Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <div>
                        <label>Position Y</label>
                        <select id="imagePositionY">
                            <option value="top">Top</option>
                            <option value="center" selected>Center</option>
                            <option value="bottom">Bottom</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <label>Upload Resolution</label>
                <select id="imageResolution">
                    <option value="400" selected>Medium (400px)</option>
                    <option value="600">High (600px)</option>
                    <option value="800">Very High (800px)</option>
                </select>
            </div>
        `;
        
        // Handle file upload with compression
        setTimeout(() => {
            document.getElementById('editFile').addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const resolution = parseInt(document.getElementById('imageResolution').value);
                    compressAndConvert(file, resolution).then(compressedDataUrl => {
                        document.getElementById('editValue').value = compressedDataUrl;
                    });
                }
            });
        }, 100);
    } else if (element.classList.contains('editable-icon')) {
        title.textContent = 'Edit Icon';
        content.innerHTML = `
            <div class="form-group">
                <label>Font Awesome Icon Class</label>
                <input type="text" id="editValue" value="${currentValue}" placeholder="e.g., fas fa-bolt" required>
            </div>
        `;
    } else {
        title.textContent = 'Edit Text';
        content.innerHTML = `
            <div class="form-group">
                <label>Text Content</label>
                <input type="text" id="editValue" value="${currentValue}" required>
            </div>
        `;
    }
    
    modal.style.display = 'block';
}



// Compress image before converting to base64
function compressAndConvert(file, maxWidth = 400) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Use selected resolution
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Convert to base64 with 70% quality
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(compressedDataUrl);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

// Handle edit form submission
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const field = document.getElementById('editField').value;
    let value = document.getElementById('editValue').value;
    
    if (!value.trim()) {
        showNotification('Please enter an image URL or upload a file', 'error');
        return;
    }
    
    // Allow base64 data URLs from file uploads
    if (!value.startsWith('http') && !value.startsWith('data:')) {
        showNotification('Please enter a valid URL or upload an image file', 'error');
        return;
    }
    
    try {
        // Get image styling if it's an image
        let imageStyles = {};
        if (document.getElementById('imageWidth')) {
            const width = document.getElementById('imageWidth').value;
            const posX = document.getElementById('imagePositionX').value;
            const posY = document.getElementById('imagePositionY').value;
            
            imageStyles = {
                [`${field}_width`]: width ? width + 'px' : 'auto',
                [`${field}_height`]: 'auto',
                [`${field}_positionX`]: posX,
                [`${field}_positionY`]: posY
            };
        }
        
        // Save to settings (this becomes the new default for all users)
        await db.collection('settings').doc('site').set({
            [field]: value,
            ...imageStyles,
            updatedAt: new Date()
        }, { merge: true });
        
        // Update the element immediately
        updateElement(field, value);
        
        // Apply image styling if it's an image
        if (Object.keys(imageStyles).length > 0) {
            const element = document.querySelector(`[data-field="${field}"]`);
            if (element) {
                if (imageStyles[`${field}_width`]) element.style.width = imageStyles[`${field}_width`];
                element.style.height = 'auto';
                if (imageStyles[`${field}_positionX`] || imageStyles[`${field}_positionY`]) {
                    element.style.objectPosition = `${imageStyles[`${field}_positionX`]} ${imageStyles[`${field}_positionY`]}`;
                }
            }
        }
        
        closeEditModal();
        showNotification('Element updated successfully! Changes will appear for all users.', 'success');
    } catch (error) {
        showNotification('Error updating element: ' + error.message, 'error');
    }
});

// Update element with new value
function updateElement(field, value) {
    const element = document.querySelector(`[data-field="${field}"]`);
    if (!element) return;
    
    if (element.classList.contains('editable-text')) {
        element.textContent = value;
    } else if (element.classList.contains('editable-image')) {
        element.src = value;
    } else if (element.classList.contains('editable-background')) {
        element.style.backgroundImage = `url(${value})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
    } else if (element.classList.contains('editable-icon')) {
        element.className = `editable-icon ${value}`;
    }
}

// Show edit toggle for admin
auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
        updateNavForLoggedInUser(user);
        if (user.email === 'admin@cybee.com') {
            document.getElementById('editToggle').style.display = 'block';
        }
    } else {
        updateNavForLoggedOutUser();
        document.getElementById('editToggle').style.display = 'none';
    }
    updateCartDisplay();
});