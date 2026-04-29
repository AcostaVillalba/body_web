# 🚀 Deployment Guide: Body Logic Web

This document outlines the deployment process for both the **FastAPI Backend** and the **Vite Frontend**. Both components are hosted on Google Cloud Platform (GCP) and Firebase.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- [Node.js & npm](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli) (Install via `npm install -g firebase-tools`)

---

## 🏗️ Backend Deployment (Google Cloud Run)

The backend is containerized using Docker and deployed to **Google Cloud Run**. This configuration is optimized for development, allowing the service to scale to zero when not in use.

### 📍 Configuration Details
- **Project ID:** `body-web-491923`
- **Service Name:** `body-web-backend`
- **Region:** `us-central1`
- **Instance Size:** 256Mi Memory, 1 CPU
- **Scaling:** 0 to 1 instance (Scales to zero to save costs)

### 🚀 Deployment Steps

1. **Authenticate with Google Cloud:**
   ```bash
   gcloud auth login
   gcloud config set project body-web-491923
   ```

2. **Deploy the Service:**
   Navigate to the `backend` directory and run the deployment command:
   ```bash
   cd backend

   gcloud run deploy body-web-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --min-instances 0 \
     --max-instances 1 \
     --memory 256Mi \
     --cpu 1 \
     --concurrency 50
   ```

> [!CAUTION]
> **Ephemeral Storage Warning**
> The backend currently uses a local SQLite database (`bodybyja.db`). Since Cloud Run instances are ephemeral, any data saved to this database will be **lost** when the instance scales to zero or restarts. For production, consider migrating to **Cloud SQL**.

---

## 🌐 Frontend Deployment (Firebase Hosting)

The frontend is a Vite application deployed to **Firebase Hosting**.

### 📍 Configuration Details
- **Project ID:** `body-web-491923`
- **Hosting Site:** `body-web-491923`
- **Build Directory:** `dist/`

### 🚀 Deployment Steps

1. **Build the Application:**
   From the project root, generate the production build:
   ```bash
   npm run build
   ```

2. **Authenticate with Firebase:**
   ```bash
   npx firebase-tools login
   ```

3. **Deploy to Hosting:**
   ```bash
   npx firebase-tools deploy --only hosting
   ```

### 🔍 Useful Firebase Commands
- **List Projects:** `npx firebase-tools projects:list`
- **Check Login Status:** `npx firebase-tools login:list`

---

## 🔄 Post-Deployment

After deploying both components:
1. Copy the **Service URL** provided by the Cloud Run deployment.
2. Ensure the frontend is configured to point to this backend URL (usually via environment variables or a config file).
3. Verify the live application at your Firebase Hosting URL (e.g., `https://body-web-491923.web.app`).

---

> [!TIP]
> **Scaling & Costs**
> This setup is designed to be **free or very low cost** for development. Scaling to zero ensures you only pay for the exact milliseconds your code is running.
