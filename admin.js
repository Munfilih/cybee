// Check if user is admin on page load
auth.onAuthStateChanged((user) => {
    if (!user || user.email !== 'admin@cybee.com') {
        window.location.href = 'index.html';
        return;
    }
    loadDashboardData();
});

// Load dashboard data
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        loadDashboardData();
        loadProductsList();
        loadCategoriesList();
        loadOffersList();
        loadUsersList();
        loadOrdersList();
        loadSiteSettings();
    }, 1000);
});

// Show different admin sections
function showSection(sectionName) {
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName).classList.add('active');
}

// Load dashboard statistics
async function loadDashboardData() {
    try {
        const [productsSnapshot, usersSnapshot, offersSnapshot, ordersSnapshot] = await Promise.all([
            db.collection('products').get(),
            db.collection('users').get(),
            db.collection('offers').get(),
            db.collection('orders').get()
        ]);
        
        document.getElementById('totalProducts').textContent = productsSnapshot.size || 0;
        document.getElementById('totalUsers').textContent = usersSnapshot.size || 0;
        document.getElementById('totalOffers').textContent = offersSnapshot.size || 0;
        document.getElementById('totalOrders').textContent = ordersSnapshot.size || 0;
        
        console.log('Dashboard loaded:', {
            products: productsSnapshot.size,
            users: usersSnapshot.size,
            offers: offersSnapshot.size,
            orders: ordersSnapshot.size
        });
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values on error
        document.getElementById('totalProducts').textContent = '0';
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('totalOffers').textContent = '0';
        document.getElementById('totalOrders').textContent = '0';
    }
}

// Category management
function showAddCategory() {
    document.getElementById('addCategoryModal').style.display = 'block';
}

async function loadCategoriesList() {
    try {
        const snapshot = await db.collection('categories').get();
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const category = doc.data();
            const listItem = document.createElement('div');
            listItem.className = 'admin-item';
            listItem.innerHTML = `
                <i class="${category.icon}" style="font-size: 2rem; color: #007bff; margin-right: 1rem;"></i>
                <div class="admin-item-info">
                    <h4>${category.name}</h4>
                    <p>${category.description || 'No description'}</p>
                </div>
                <div class="admin-actions">
                    <button class="btn-edit" onclick="editCategory('${doc.id}', '${category.name}')">Edit</button>
                    <button class="btn-delete" onclick="deleteCategory('${doc.id}')">Delete</button>
                </div>
            `;
            categoriesList.appendChild(listItem);
        });
        
        // Update category dropdown in product form
        updateCategoryDropdown();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function updateCategoryDropdown() {
    try {
        const snapshot = await db.collection('categories').get();
        const categorySelect = document.getElementById('productCategory');
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        snapshot.forEach((doc) => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error updating category dropdown:', error);
    }
}

// Product management
function showAddProduct() {
    document.getElementById('addProductModal').style.display = 'block';
}

function showAddOffer() {
    document.getElementById('addOfferModal').style.display = 'block';
}

// Add product form handler
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        // Check if user is authenticated as admin
        const user = auth.currentUser;
        if (!user || user.email !== 'admin@cybee.com') {
            showNotification('Admin access required', 'error');
            return;
        }
        
        const price = parseFloat(document.getElementById('productPrice').value);
        const discount = parseInt(document.getElementById('productDiscount').value || 0);
        const finalPrice = discount > 0 ? price - (price * discount / 100) : price;
        
        const productData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: price,
            discount: discount,
            finalPrice: finalPrice,
            stock: parseInt(document.getElementById('productStock').value),
            category: document.getElementById('productCategory').value,
            priority: parseInt(document.getElementById('productPriority').value || 2),
            featured: document.getElementById('productFeatured').checked,
            images: getProductImages(),
            createdAt: new Date()
        };
        
        await db.collection('products').add(productData);
        closeModal('addProductModal');
        document.getElementById('addProductForm').reset();
        clearImages();
        loadProductsList();
        loadDashboardData();
        document.getElementById('finalPrice').value = '';
        showNotification('Product added successfully!', 'success');
    } catch (error) {
        console.error('Full error:', error);
        showNotification('Error adding product: ' + error.message, 'error');
    }
});

// Add offer form handler
document.getElementById('addOfferForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user || user.email !== 'admin@cybee.com') {
            showNotification('Admin access required', 'error');
            return;
        }
        
        const offerData = {
            title: document.getElementById('offerTitle').value,
            description: document.getElementById('offerDescription').value,
            discount: parseInt(document.getElementById('offerDiscount').value),
            image: document.getElementById('offerImage').value,
            createdAt: new Date()
        };
        
        await db.collection('offers').add(offerData);
        closeModal('addOfferModal');
        document.getElementById('addOfferForm').reset();
        loadOffersList();
        loadDashboardData();
        showNotification('Offer added successfully!', 'success');
    } catch (error) {
        showNotification('Error adding offer: ' + error.message, 'error');
    }
});

// Load products list for admin
async function loadProductsList() {
    try {
        const snapshot = await db.collection('products').get();
        const productsList = document.getElementById('productsList');
        productsList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const product = doc.data();
            const listItem = document.createElement('div');
            listItem.className = 'admin-item';
            const priceDisplay = product.discount > 0 ? 
                `<span style="text-decoration: line-through; color: #999;">₹${product.price}</span> ₹${product.finalPrice} (${product.discount}% off)` : 
                `₹${product.price}`;
            listItem.innerHTML = `
                <img src="${product.images && product.images[0] ? product.images[0] : 'https://via.placeholder.com/60x60'}" alt="${product.name}">
                <div class="admin-item-info">
                    <h4>${product.name}</h4>
                    <p>Price: ${priceDisplay} | Stock: ${product.stock}</p>
                </div>
                <div class="admin-actions">
                    <button class="btn-delete" onclick="deleteProduct('${doc.id}')">Delete</button>
                </div>
            `;
            productsList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading products list:', error);
    }
}

// Load offers list for admin
async function loadOffersList() {
    try {
        const snapshot = await db.collection('offers').get();
        const offersList = document.getElementById('offersList');
        offersList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const offer = doc.data();
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.innerHTML = `
                <div>
                    <h4>${offer.title}</h4>
                    <p>Discount: ${offer.discount}%</p>
                </div>
                <div class="item-actions">
                    <button class="btn-small btn-danger" onclick="deleteOffer('${doc.id}')">Delete</button>
                </div>
            `;
            offersList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading offers list:', error);
    }
}

// Load users list for admin
async function loadUsersList() {
    try {
        const snapshot = await db.collection('users').get();
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const user = doc.data();
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.innerHTML = `
                <div>
                    <h4>${user.name}</h4>
                    <p>Email: ${user.email} | Role: ${user.role}</p>
                </div>
            `;
            usersList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading users list:', error);
    }
}

// Delete functions
async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await db.collection('products').doc(productId).delete();
            loadProductsList();
            loadDashboardData();
            showNotification('Product deleted successfully!', 'success');
        } catch (error) {
            showNotification('Error deleting product: ' + error.message, 'error');
        }
    }
}

async function deleteOffer(offerId) {
    if (confirm('Are you sure you want to delete this offer?')) {
        try {
            await db.collection('offers').doc(offerId).delete();
            loadOffersList();
            loadDashboardData();
            showNotification('Offer deleted successfully!', 'success');
        } catch (error) {
            showNotification('Error deleting offer: ' + error.message, 'error');
        }
    }
}

// Modal and utility functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Load orders list for admin
async function loadOrdersList() {
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        const ordersList = document.getElementById('ordersList');
        ordersList.innerHTML = '';
        
        snapshot.forEach((doc) => {
            const order = doc.data();
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.innerHTML = `
                <div>
                    <h4>Order #${doc.id.substring(0, 8)}</h4>
                    <p>Customer: ${order.userEmail} | Total: ₹${order.total.toFixed(2)}</p>
                    <p>Status: <span style="color: ${order.status === 'pending' ? '#f39c12' : '#27ae60'}">${order.status}</span></p>
                    <p>Items: ${order.items.length} | Date: ${order.createdAt ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'Recent'}</p>
                </div>
                <div class="item-actions">
                    <select onchange="updateOrderStatus('${doc.id}', this.value)" style="margin-right: 0.5rem;">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                        <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                    <button class="btn-small" onclick="viewOrderDetails('${doc.id}')">View</button>
                </div>
            `;
            ordersList.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading orders list:', error);
    }
}

// Update order status
async function updateOrderStatus(orderId, newStatus) {
    try {
        await db.collection('orders').doc(orderId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('Order status updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating order status: ' + error.message, 'error');
    }
}

// View order details
async function viewOrderDetails(orderId) {
    try {
        const doc = await db.collection('orders').doc(orderId).get();
        const order = doc.data();
        
        let itemsList = order.items.map(item => 
            `${item.name} x ${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`
        ).join('\n');
        
        showOrderModal(orderId, order, itemsList);
    } catch (error) {
        showNotification('Error loading order details: ' + error.message, 'error');
    }
}

// Multiple image handling
let productImages = [];

function addImageUrl() {
    const url = document.getElementById('productImageUrl').value.trim();
    if (url) {
        productImages.push(url);
        updateImagePreview();
        document.getElementById('productImageUrl').value = '';
    }
}

function removeImage(index) {
    productImages.splice(index, 1);
    updateImagePreview();
}

function updateImagePreview() {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    
    productImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'image-preview-item';
        item.innerHTML = `
            <img src="${image}" alt="Product ${index + 1}">
            <button type="button" onclick="removeImage(${index})">Remove</button>
        `;
        preview.appendChild(item);
    });
}

document.getElementById('productImageFile').addEventListener('change', function(e) {
    const files = Array.from(e.target.files);
    files.forEach(file => {
        if (file.size > 500000) {
            showNotification('Image too large. Please use image URLs instead.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = Math.min(400, img.width);
                canvas.height = (canvas.width / img.width) * img.height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedData = canvas.toDataURL('image/jpeg', 0.7);
                productImages.push(compressedData);
                updateImagePreview();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
});

function getProductImages() {
    if (productImages.length === 0) {
        return ['https://via.placeholder.com/300x200'];
    }
    return productImages.slice(0, 5); // Limit to 5 images max
}

function clearImages() {
    productImages = [];
    updateImagePreview();
    document.getElementById('productImageFile').value = '';
    document.getElementById('productImageUrl').value = '';
}

// Add category form handler
document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user || user.email !== 'admin@cybee.com') {
            showNotification('Admin access required', 'error');
            return;
        }
        
        const categoryData = {
            name: document.getElementById('categoryName').value,
            icon: 'fas fa-tag',
            description: '',
            createdAt: new Date()
        };
        
        await db.collection('categories').add(categoryData);
        closeModal('addCategoryModal');
        document.getElementById('addCategoryForm').reset();
        loadCategoriesList();
        showNotification('Category added successfully!', 'success');
    } catch (error) {
        showNotification('Error adding category: ' + error.message, 'error');
    }
});

// Edit category form handler
document.getElementById('editCategoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const user = auth.currentUser;
        if (!user || user.email !== 'admin@cybee.com') {
            showNotification('Admin access required', 'error');
            return;
        }
        
        const categoryId = document.getElementById('editCategoryId').value;
        const categoryData = {
            name: document.getElementById('editCategoryName').value,
            updatedAt: new Date()
        };
        
        await db.collection('categories').doc(categoryId).update(categoryData);
        closeModal('editCategoryModal');
        loadCategoriesList();
        showNotification('Category updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating category: ' + error.message, 'error');
    }
});

async function deleteCategory(categoryId) {
    try {
        // Check if category is used by any products
        const productsSnapshot = await db.collection('products').where('category', '==', categoryId).get();
        if (!productsSnapshot.empty) {
            showNotification('Cannot delete category: It is being used by ' + productsSnapshot.size + ' product(s). Please change the category of these products first.', 'error');
            return;
        }
        
        if (confirm('Are you sure you want to delete this category?')) {
            await db.collection('categories').doc(categoryId).delete();
            loadCategoriesList();
            showNotification('Category deleted successfully!', 'success');
        }
    } catch (error) {
        showNotification('Error deleting category: ' + error.message, 'error');
    }
}

function editCategory(categoryId, currentName) {
    document.getElementById('editCategoryId').value = categoryId;
    document.getElementById('editCategoryName').value = currentName;
    document.getElementById('editCategoryModal').style.display = 'block';
}

// Auto-calculate final price when discount changes
document.getElementById('productDiscount').addEventListener('input', function() {
    const price = parseFloat(document.getElementById('productPrice').value || 0);
    const discount = parseInt(this.value || 0);
    const finalPrice = discount > 0 ? price - (price * discount / 100) : price;
    document.getElementById('finalPrice').value = finalPrice.toFixed(2);
});

document.getElementById('productPrice').addEventListener('input', function() {
    const price = parseFloat(this.value || 0);
    const discount = parseInt(document.getElementById('productDiscount').value || 0);
    const finalPrice = discount > 0 ? price - (price * discount / 100) : price;
    document.getElementById('finalPrice').value = finalPrice.toFixed(2);
});

// Notification system
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// Order details modal
function showOrderModal(orderId, order, itemsList) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>Order Details</h2>
            <div style="padding: 1rem;">
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Customer:</strong> ${order.userEmail}</p>
                <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                <h3>Items:</h3>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 4px; margin: 1rem 0;">
                    ${itemsList.split('\n').map(item => `<p>${item}</p>`).join('')}
                </div>
                <h3>Shipping Address:</h3>
                <p>${order.shippingInfo.firstName} ${order.shippingInfo.lastName}</p>
                <p>${order.shippingInfo.address}</p>
                <p>${order.shippingInfo.city}, ${order.shippingInfo.zipCode}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Background image management
async function updateBackground() {
    const url = document.getElementById('backgroundUrl').value.trim();
    if (!url) {
        showNotification('Please enter a background image URL', 'error');
        return;
    }
    
    try {
        const user = auth.currentUser;
        if (!user || user.email !== 'admin@cybee.com') {
            showNotification('Admin access required', 'error');
            return;
        }
        
        await db.collection('settings').doc('site').set({
            backgroundImage: url,
            updatedAt: new Date()
        }, { merge: true });
        
        // Update preview
        document.getElementById('backgroundPreview').innerHTML = `
            <img src="${url}" style="width: 200px; height: 100px; object-fit: cover; border-radius: 4px;" alt="Background Preview">
        `;
        
        showNotification('Background image updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating background: ' + error.message, 'error');
    }
}

// Load site settings
async function loadSiteSettings() {
    try {
        const doc = await db.collection('settings').doc('site').get();
        if (doc.exists) {
            const settings = doc.data();
            
            if (settings.backgroundImage) {
                document.getElementById('backgroundUrl').value = settings.backgroundImage;
                document.getElementById('backgroundPreview').innerHTML = `
                    <img src="${settings.backgroundImage}" style="width: 200px; height: 100px; object-fit: cover; border-radius: 4px;" alt="Background Preview">
                `;
            }
            
            if (settings.logoText) document.getElementById('logoTextInput').value = settings.logoText;
            if (settings.logoIcon) document.getElementById('logoIconInput').value = settings.logoIcon;
            if (settings.topBarText) document.getElementById('topBarInput').value = settings.topBarText;
            if (settings.heroTitle) document.getElementById('heroTitleInput').value = settings.heroTitle;
            if (settings.heroSubtitle) document.getElementById('heroSubtitleInput').value = settings.heroSubtitle;
            if (settings.heroButtonText) document.getElementById('heroButtonInput').value = settings.heroButtonText;
            if (settings.heroImage) document.getElementById('heroImageInput').value = settings.heroImage;
        }
    } catch (error) {
        console.error('Error loading site settings:', error);
    }
}

// Update logo
async function updateLogo() {
    const logoText = document.getElementById('logoTextInput').value.trim();
    const logoIcon = document.getElementById('logoIconInput').value.trim();
    
    if (!logoText) {
        showNotification('Please enter logo text', 'error');
        return;
    }
    
    try {
        await db.collection('settings').doc('site').set({
            logoText: logoText,
            logoIcon: logoIcon || 'fas fa-bolt',
            updatedAt: new Date()
        }, { merge: true });
        
        showNotification('Logo updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating logo: ' + error.message, 'error');
    }
}

// Update top bar
async function updateTopBar() {
    const topBarText = document.getElementById('topBarInput').value.trim();
    
    if (!topBarText) {
        showNotification('Please enter top bar text', 'error');
        return;
    }
    
    try {
        await db.collection('settings').doc('site').set({
            topBarText: topBarText,
            updatedAt: new Date()
        }, { merge: true });
        
        showNotification('Top bar updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating top bar: ' + error.message, 'error');
    }
}

// Update hero section
async function updateHero() {
    const heroTitle = document.getElementById('heroTitleInput').value.trim();
    const heroSubtitle = document.getElementById('heroSubtitleInput').value.trim();
    const heroButtonText = document.getElementById('heroButtonInput').value.trim();
    const heroImage = document.getElementById('heroImageInput').value.trim();
    
    if (!heroTitle) {
        showNotification('Please enter hero title', 'error');
        return;
    }
    
    try {
        await db.collection('settings').doc('site').set({
            heroTitle: heroTitle,
            heroSubtitle: heroSubtitle || 'Discover cutting-edge technology at unbeatable prices',
            heroButtonText: heroButtonText || 'Shop Now',
            heroImage: heroImage || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
            updatedAt: new Date()
        }, { merge: true });
        
        showNotification('Hero section updated successfully!', 'success');
    } catch (error) {
        showNotification('Error updating hero section: ' + error.message, 'error');
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}