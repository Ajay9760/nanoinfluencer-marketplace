# NanoInfluencer Marketplace - How to Run

## 🚀 Quick Start Guide

### Step 1: Start Backend Server
1. Open **PowerShell** or **Command Prompt**
2. Navigate to backend folder:
   ```
   cd C:\Users\HP\Documents\nanoinfluencer-marketplace\backend
   ```
3. Start the backend:
   ```
   npm start
   ```
4. You should see: "✅ Server startup completed successfully!"
5. **Keep this window open!**

### Step 2: Start Frontend Server  
1. Open **another** PowerShell/Command Prompt window
2. Navigate to frontend folder:
   ```
   cd C:\Users\HP\Documents\nanoinfluencer-marketplace\frontend-web
   ```
3. Start the frontend:
   ```
   npm start
   ```
4. Wait for "Compiled successfully!" message
5. **Keep this window open too!**

### Step 3: Access the Application
- Open your web browser
- Go to: **http://localhost:3000**

## 🔐 Testing the Application

### Registration (Create New Account)
1. Go to http://localhost:3000/auth
2. Click "create a new account"  
3. **You should now see Brand/Influencer selection buttons**
4. Choose "I'm a Brand" or "I'm an Influencer"
5. Fill in the form:
   - Name: Your Name
   - Email: any email (e.g., test@example.com)
   - Password: Must include uppercase, lowercase, and numbers (e.g., **Password123**)
   - Confirm Password: Same password
6. Click "Create Account"

### Login (Existing Account)
1. Go to http://localhost:3000/auth (default is login mode)
2. Use the same email/password you registered with
3. Click "Sign in"

### Google OAuth Demo
1. On the auth page, click "Continue with Google (Demo)"
2. This simulates Google login without needing real Google credentials

## 📊 Database Persistence
- ✅ **Fixed!** User data is now saved to `backend/database.sqlite`
- Your login details persist between server restarts
- Database file is created automatically

## 🛠️ Troubleshooting

### "Connection Refused" Error
- Make sure **both** backend and frontend servers are running
- Backend should be on port 3001
- Frontend should be on port 3000
- Check if any antivirus is blocking the connections

### "Password validation failed" 
- Password MUST contain:
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)  
  - At least 1 number (0-9)
  - Minimum 6 characters
- Example good password: **Password123**

### Brand/Influencer buttons not showing
- Make sure you're in "registration" mode (not login)
- Click "create a new account" to switch to registration
- The buttons appear below the title when registering

### Server won't start
- Kill any existing processes:
  ```
  Get-Process -Name node | Stop-Process -Force
  ```
- Try starting servers again

## 🎯 Features Working
- ✅ User registration with role selection (Brand/Influencer)
- ✅ User login with persistent sessions
- ✅ Google OAuth simulation 
- ✅ Protected dashboard routes
- ✅ Analytics API
- ✅ Social media management
- ✅ SQLite database persistence

## 📍 Important URLs
- **Homepage:** http://localhost:3000
- **Login/Register:** http://localhost:3000/auth  
- **Dashboard:** http://localhost:3000/app (requires login)
- **Backend API:** http://localhost:3001/api/health

## 🔄 Restarting Servers
If you need to restart:
1. Press **Ctrl+C** in both PowerShell windows to stop servers
2. Wait 2-3 seconds
3. Run `npm start` again in each window

---

**🎉 That's it! Your NanoInfluencer Marketplace should now be fully functional!**