# Cybee Store - E-commerce Web Application

A complete e-commerce web application with Firebase backend for product management and user authentication.

## Features

- **Home Page**: Product display with offers and navigation
- **User Authentication**: Sign up and login functionality
- **Admin Dashboard**: Complete admin panel for managing products, offers, and users
- **Firebase Integration**: Real-time database and authentication
- **Responsive Design**: Mobile-friendly interface

## Admin Credentials
- Email: `admin@admin.com`
- Password: `admin`

## Firebase Setup Guide

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name (e.g., "cybee-store")
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

### Step 3: Create Firestore Database
1. Go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development)
4. Select a location close to your users
5. Click "Done"

### Step 4: Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Web" icon (</>) to add web app
4. Register app with name "Cybee Store"
5. Copy the configuration object

### Step 5: Update Configuration
Replace the content in `firebase-config.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "your-actual-sender-id",
    appId: "your-actual-app-id"
};
```

### Step 6: Set Up Firestore Collections

The app uses these Firestore collections:

#### Products Collection (`products`)
```javascript
{
    name: "Product Name",
    description: "Product description",
    price: 29.99,
    image: "https://example.com/image.jpg",
    stock: 100,
    createdAt: timestamp
}
```

#### Offers Collection (`offers`)
```javascript
{
    title: "Special Offer",
    description: "Offer description",
    discount: 20,
    image: "https://example.com/offer-image.jpg",
    createdAt: timestamp
}
```

#### Users Collection (`users`)
```javascript
{
    name: "User Name",
    email: "user@example.com",
    role: "user",
    createdAt: timestamp
}
```

### Step 7: Create Admin User
1. Run the application
2. Sign up with email: `admin@admin.com` and password: `admin`
3. This will automatically redirect to admin dashboard

### Step 8: Add Sample Data (Optional)

You can manually add sample products and offers through the admin dashboard, or add them directly in Firestore Console:

**Sample Product:**
- Collection: `products`
- Document ID: Auto-generated
- Fields:
  - name: "Laptop"
  - description: "High-performance laptop"
  - price: 999.99
  - image: "https://via.placeholder.com/300x200"
  - stock: 50

**Sample Offer:**
- Collection: `offers`
- Document ID: Auto-generated
- Fields:
  - title: "Summer Sale"
  - description: "Get 25% off on all electronics"
  - discount: 25
  - image: "https://via.placeholder.com/300x200"

## Running the Application

1. Open `index.html` in a web browser
2. Or use a local server (recommended):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```
3. Navigate to the local server URL

## File Structure

```
Cybee/
├── index.html          # Home page
├── admin.html          # Admin dashboard
├── styles.css          # CSS styles
├── app.js             # Main application logic
├── admin.js           # Admin functionality
├── firebase-config.js  # Firebase configuration
└── README.md          # This file
```

## Usage

### For Users:
1. Browse products and offers on home page
2. Sign up for new account or login
3. View products and special offers

### For Admin:
1. Login with admin credentials
2. Access admin dashboard
3. Manage products (add/delete)
4. Manage offers (add/delete)
5. View user statistics

## Security Notes

- Change admin credentials in production
- Set up proper Firestore security rules
- Use environment variables for sensitive config
- Enable Firebase App Check for additional security

## Firestore Security Rules (Production)

Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Everyone can read products and offers
    match /products/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /offers/{document} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```