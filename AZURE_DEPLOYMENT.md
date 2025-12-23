# 🚀 BeamLab - Azure Deployment Guide

**Domain:** `beamlabultimate.tech`  
**Framework:** Microsoft Azure + GitHub Student Pack  
**Cost:** $0/month (covered by $100 student credit)

---

## 📋 TABLE OF CONTENTS

1. [Overview & Benefits](#overview--benefits)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Step 1: Activate Student Benefits](#step-1-activate-student-benefits)
5. [Step 2: Push Code to GitHub](#step-2-push-code-to-github)
6. [Step 3: Deploy Frontend](#step-3-deploy-frontend-azure-static-web-apps)
7. [Step 4: Deploy Node.js Backend](#step-4-deploy-nodejs-backend-azure-app-service)
8. [Step 5: Deploy Python Backend](#step-5-deploy-python-backend-azure-app-service)
9. [Step 6: Configure Custom Domain](#step-6-configure-custom-domain)
10. [Step 7: Set Up GitHub Actions](#step-7-set-up-github-actions)
11. [Troubleshooting](#troubleshooting)
12. [Cost Breakdown](#cost-breakdown)

---

## 🎓 OVERVIEW & BENEFITS

### GitHub Student Developer Pack - Azure Benefits

With your **GitHub Student Developer Pack**, you get:

| Service | Benefit | Value |
|---------|---------|-------|
| **Microsoft Azure** | $100 credit | 🆓 Free (1 year) |
| **Azure Static Web Apps** | 100 GB bandwidth/month | 🆓 Free |
| **Azure App Service** | 10 web apps | 🆓 Free F1 tier |
| **MongoDB Atlas** | M0 tier (512MB) | 🆓 Free |
| **Clerk Auth** | 10,000 Monthly Active Users | 🆓 Free |
| **Google AI Studio** | Gemini API | 🆓 Free tier |

**Total Monthly Cost:** **$0** (Forever!)

### What You're Getting

✅ **Professional hosting** for production app  
✅ **Auto-deployment** with GitHub Actions  
✅ **SSL certificates** included  
✅ **Global CDN** for your static assets  
✅ **Automatic scaling** (within free limits)  
✅ **Database backup** with MongoDB Atlas  

---

## ✅ PREREQUISITES

Before starting, ensure you have:

- [ ] GitHub Student Developer Pack (activated)
- [ ] GitHub account with code pushed
- [ ] Azure account (created)
- [ ] MongoDB Atlas M0 cluster (created)
- [ ] Clerk project (created with keys)
- [ ] Google AI API key (obtained)
- [ ] get.tech domain (beamlabultimate.tech)

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Microsoft Azure Platform                       │
│                    beamlabultimate.tech (get.tech)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  Static Web App    │  │   App Service    │  │  App Service    │ │
│  │   (Frontend)       │  │   (Node.js API)  │  │  (Python AI)    │ │
│  │                    │  │                  │  │                 │ │
│  │  React + Vite      │  │  Express.js      │  │  FastAPI        │ │
│  │  TypeScript        │  │  MongoDB         │  │  Google Gemini  │ │
│  │  Tailwind CSS      │  │  Clerk Auth      │  │  NumPy/SciPy    │ │
│  │                    │  │                  │  │                 │ │
│  │  FREE              │  │  F1 FREE         │  │  F1 FREE        │ │
│  │  100GB/month       │  │  (1GB RAM)       │  │  (1GB RAM)      │ │
│  └────────┬───────────┘  └────────┬─────────┘  └────────┬────────┘ │
│           │                       │                     │            │
└───────────┼───────────────────────┼─────────────────────┼────────────┘
            │                       │                     │
      ┌─────┴───────────┬───────────┴──────┬──────────────┘
      │                 │                  │
┌─────▼─────┐     ┌─────▼──────┐    ┌─────▼─────┐
│  MongoDB  │     │    Clerk   │    │ Google AI │
│   Atlas   │     │    Auth    │    │  Gemini   │
│ (Free M0) │     │ (10K MAUs) │    │ (Free)    │
└───────────┘     └────────────┘    └───────────┘
```

### URL Structure

- **Frontend:** `https://beamlabultimate.tech`
- **Node.js API:** `https://api-beamlab.azurewebsites.net`
- **Python API:** `https://ai-beamlab.azurewebsites.net`

---

## STEP 1: ACTIVATE STUDENT BENEFITS

### 1.1 Get GitHub Student Pack

**Estimated Time:** 5-10 minutes (instant if already verified)

1. **Navigate to GitHub Student Pack**
   - Open your browser
   - Go to **[education.github.com/pack](https://education.github.com/pack)**
   - You'll see the main student pack landing page

2. **Start Application**
   - Click the green **"Get your pack"** button (center of page)
   - Sign in with your GitHub account if not already logged in

3. **Verify Student Status**
   
   You'll need ONE of these:
   - **School email** (ends with .edu or your school domain)
   - **Student ID photo** (clear photo showing name, school, date)
   - **Proof of enrollment** (official document from your school)
   
   **Step-by-step:**
   - Select **"Individual student"**
   - Enter your **school email address**
   - Enter your **school name** (it will autocomplete)
   - Describe how you plan to use GitHub (e.g., "Building web applications for coursework and personal projects")
   - Click **"Submit your information"**

4. **Wait for Verification**
   - **If using .edu email:** Usually instant ✅
   - **If uploading documents:** 1-7 days
   - Check your email for confirmation

5. **Access Microsoft Azure Benefit**
   - Once verified, return to [education.github.com/pack](https://education.github.com/pack)
   - Scroll down to find **"Microsoft Azure"**
   - Click **"Get access to Microsoft Azure"**
   - You'll see: "$100 credit for 12 months"

### 1.2 Create Azure Account

**Estimated Time:** 10-15 minutes

1. **Start Azure Sign-up**
   - Click the **"Get Azure credit"** link from Student Pack
   - You'll be redirected to Azure for Students page
   - Click **"Activate now"**

2. **Sign in with Microsoft Account**
   
   **Option A - If you have a Microsoft account:**
   - Sign in with your existing Microsoft/Outlook account
   
   **Option B - If you DON'T have one:**
   - Click **"Create one"**
   - Enter your email (can be any email, not just .edu)
   - Create a password (8+ characters, mix of letters, numbers, symbols)
   - Verify email with the code sent to your inbox

3. **Student Verification**
   - Azure will detect you came from GitHub Student Pack
   - Enter your **school email** again
   - Click **"Verify academic status"**
   - Azure will send a verification code to your email
   - Enter the 6-digit code

4. **Complete Profile**
   
   Fill in ALL required fields:
   - **First name:** Your legal first name
   - **Last name:** Your legal last name
   - **Country/Region:** Your location
   - **School name:** Select from dropdown (start typing)
   - **Phone number:** Your mobile number
   - Click **"Sign up"**

5. **No Credit Card Required! 🎉**
   - Azure for Students does NOT require a credit card
   - You get $100 credit with NO payment info needed
   - You will NEVER be charged

6. **Verify Your Credit**
   
   **Important: Check that you received the credit!**
   
   - Go to **[portal.azure.com](https://portal.azure.com)**
   - Sign in with the account you just created
   - Look for the top menu bar → Click **"Subscriptions"**
   - You should see: **"Azure for Students"**
   - Click on it
   - You'll see: 
     - **Credit balance:** $100.00 USD
     - **Expiry date:** (12 months from now)

**Troubleshooting:**
- ❌ **"Not eligible"** error → Use your school .edu email
- ❌ Credit not showing → Wait 10 minutes and refresh
- ❌ Can't verify → Contact GitHub Education support

**✅ Success Criteria:**
- You can log into portal.azure.com
- You see "Azure for Students" subscription
- Credit shows $100.00

---

## STEP 2: PUSH CODE TO GITHUB

**Estimated Time:** 5-10 minutes

### 2.1 Create GitHub Repository

1. **Go to GitHub**
   - Navigate to **[github.com](https://github.com)**
   - Click the **"+"** icon (top right corner)
   - Select **"New repository"**

2. **Configure Repository**
   
   Fill in these details:
   - **Repository name:** `beamlab-ultimate` (exactly this, lowercase)
   - **Description:** "Professional structural analysis platform for engineers"
   - **Visibility:** 
     - ✅ **Public** (recommended - allows GitHub Actions)
     - OR Private (requires GitHub Pro for unlimited Actions)
   - **Initialize:**
     - ❌ Do NOT check "Add a README"
     - ❌ Do NOT add .gitignore
     - ❌ Do NOT add license
     - (We already have these files locally)
   - Click **"Create repository"**

3. **Copy Repository URL**
   - You'll see a "Quick setup" page
   - Find the HTTPS URL: `https://github.com/YOUR_USERNAME/beamlab-ultimate.git`
   - Click the copy icon 📋 next to it

### 2.2 Connect Local Repository to GitHub

1. **Open Terminal**
   - On Mac: Press `Cmd + Space` → type "Terminal"
   - Navigate to project:
   ```bash
   cd /Users/rakshittiwari/Desktop/new/beamlab-ultimate
   ```

2. **Check Git Status**
   ```bash
   git status
   ```
   - You should see: "On branch main"
   - If you see uncommitted changes, that's okay

3. **Add GitHub as Remote**
   
   **Replace YOUR_USERNAME with your actual GitHub username!**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/beamlab-ultimate.git
   ```
   
   **Example:**
   ```bash
   git remote add origin https://github.com/rakshit123/beamlab-ultimate.git
   ```

4. **Verify Remote**
   ```bash
   git remote -v
   ```
   - Should show:
     ```
     origin  https://github.com/YOUR_USERNAME/beamlab-ultimate.git (fetch)
     origin  https://github.com/YOUR_USERNAME/beamlab-ultimate.git (push)
     ```

### 2.3 Push Code to GitHub

1. **Stage All Files**
   ```bash
   git add -A
   ```
   - This stages ALL files (including new ones)
   - The `-A` means "all files"

2. **Commit Changes**
   ```bash
   git commit -m "Initial commit - Azure deployment ready"
   ```
   - If you get an error about git config, run:
     ```bash
     git config --global user.email "your-email@example.com"
     git config --global user.name "Your Name"
     ```
   - Then retry the commit

3. **Push to GitHub**
   ```bash
   git push -u origin main
   ```
   
   **If you get authentication error:**
   - GitHub no longer accepts passwords
   - You need a **Personal Access Token (PAT)**
   
   **How to create PAT:**
   1. Go to GitHub.com
   2. Click your profile picture → **Settings**
   3. Scroll down → **Developer settings** (left sidebar, bottom)
   4. Click **Personal access tokens** → **Tokens (classic)**
   5. Click **"Generate new token"** → **"Generate new token (classic)"**
   6. Give it a name: "BeamLab Deployment"
   7. Select scopes:
      - ✅ `repo` (all repo permissions)
      - ✅ `workflow` (for GitHub Actions)
   8. Click **"Generate token"**
   9. **COPY THE TOKEN IMMEDIATELY** (you can't see it again!)
   10. Use this token as your password when pushing

4. **Enter Credentials**
   - **Username:** Your GitHub username
   - **Password:** Paste your Personal Access Token (NOT your GitHub password)

5. **Verify Push**
   - Go to your GitHub repository page
   - Refresh the page
   - You should see all your files!

**Troubleshooting:**
- ❌ **"Authentication failed"** → Use Personal Access Token, not password
- ❌ **"Remote already exists"** → Run `git remote remove origin` then re-add
- ❌ **"Branch main doesn't exist"** → Run `git checkout -b main` first

**✅ Success Criteria:**
- All files visible on GitHub repository page
- You can see commits in the commit history
- Repository shows "main" branch

---

## STEP 3: DEPLOY FRONTEND (AZURE STATIC WEB APPS)

**Estimated Time:** 15-20 minutes (including deployment)

### 3.1 Navigate to Azure Portal

1. **Open Azure Portal**
   - Go to **[portal.azure.com](https://portal.azure.com)**
   - Sign in with your Microsoft account (from Step 1)
   - You'll see the Azure dashboard

2. **Start Creating Resource**
   - Look for the top search bar (says "Search resources, services, and docs")
   - Click on it
   - Type: **"Static Web Apps"**
   - In the dropdown, under **Services**, click **"Static Web Apps"**
   
   **OR use the menu:**
   - Click **"Create a resource"** (big + icon, top left)
   - In the search box, type **"Static Web App"**
   - Click on **"Static Web App"** in results
   - Click the blue **"Create"** button

### 3.2 Configure Basic Settings

You'll see a form with tabs: Basics | Hosting | Tags | Review + create

**On the "Basics" tab:**

1. **Project Details**
   
   | Field | What to Enter | Example |
   |-------|---------------|---------|
   | **Subscription** | Select "Azure for Students" | Azure for Students |
   | **Resource group** | Click "Create new" → Enter `beamlab-rg` → Click OK | beamlab-rg |

   **What's a Resource Group?**
   - It's a folder that holds all related Azure resources
   - We'll put all 3 services (frontend, 2 backends) in the same group
   - Easier to manage and delete if needed

2. **Static Web App Details**
   
   | Field | What to Enter | Notes |
   |-------|---------------|-------|
   | **Name** | `beamlab-frontend` | Must be unique across Azure. If taken, try `beamlab-frontend-yourname` |
   | **Plan type** | **Free** | ⚠️ IMPORTANT: Select Free, not Standard! |
   | **Region for Azure Functions** | **East Asia 2** or **Southeast Asia** | Closest to India for better speed |

3. **Deployment details**
   
   | Field | What to Select |
   |-------|----------------|
   | **Source** | GitHub |

   **You'll see a "Sign in with GitHub" button:**
   
   **Detailed Steps:**
   1. Click **"Sign in with GitHub"**
   2. A popup will open
   3. If not logged into GitHub, log in now
   4. GitHub will ask: **"Authorize Azure Static Web Apps"**
   5. Click **"Authorize AzureAppService"** (green button)
   6. You may need to enter your GitHub password again
   7. The popup will close
   8. Azure will now show your GitHub organizations/repos

4. **GitHub Repository Details**
   
   After authorization, you'll see:
   
   | Field | What to Select | Notes |
   |-------|----------------|-------|
   | **Organization** | Your GitHub username | e.g., `rakshit123` |
   | **Repository** | `beamlab-ultimate` | Select from dropdown |
   | **Branch** | `main` | Should be selected by default |

### 3.3 Configure Build Details

Still on the same page, scroll down:

**Build Details** section:

| Field | What to Enter | Critical! |
|-------|---------------|-----------|
| **Build Presets** | Select **"Custom"** from dropdown | Do NOT use React, Vite, or other presets |
| **App location** | `/apps/frontend` | Exact path to your React app |
| **Api location** | Leave **EMPTY** | We're deploying API separately |
| **Output location** | `dist` | Where Vite builds the app |

**Visual Guide:**
```
Your repo structure:
beamlab-ultimate/
├── apps/
│   ├── frontend/   ← App location: /apps/frontend
│   │   └── dist/   ← Output location: dist (relative to app location)
│   ├── backend/    ← (deploying separately)
│   └── backend-python/  ← (deploying separately)
```

**Why these values?**
- **App location:** Azure needs to know where your frontend code is
- **Output location:** After running `npm build`, Vite creates a `dist` folder
- Combined path: Azure will look in `/apps/frontend/dist` for built files

### 3.4 Review and Create

1. **Click "Review + create"** (bottom of page)

2. **Review your settings:**
   - Subscription: Azure for Students ✅
   - Resource group: beamlab-rg ✅
   - Name: beamlab-frontend ✅
   - Plan: Free ✅
   - Source: GitHub ✅
   - Repository: beamlab-ultimate ✅
   - App location: /apps/frontend ✅
   - Output location: dist ✅

3. **Click "Create"** (blue button, bottom)

### 3.5 Wait for Deployment

**What happens now:**

1. **Azure creates the Static Web App (30 seconds)**
   - You'll see "Deployment in progress..." with a loading animation
   - Wait for it to complete

2. **Azure sets up GitHub Actions (automatic)**
   - Azure automatically creates a GitHub Actions workflow file
   - It pushes this file to your repo
   - The workflow runs automatically

3. **First Build Starts (3-5 minutes)**
   - Go to **"Go to resource"** button (appears when creation completes)
   - Click it
   - You'll see your Static Web App overview page

4. **Check Deployment Status**
   
   **Option A - In Azure:**
   - On the Static Web App page
   - Look for **"Deployment History"** (left sidebar under "Deployment")
   - Click it
   - You'll see deployments listed
   - Wait for status to show **"Succeeded"** with a green checkmark ✅

   **Option B - On GitHub:**
   - Go to your GitHub repository
   - Click **"Actions"** tab (top navigation)
   - You'll see a workflow running: "Azure Static Web Apps CI/CD"
   - Click on it to see details
   - Wait for all steps to complete (green checkmarks)

### 3.6 Get Your Frontend URL

1. **Find the URL**
   - In Azure, on your Static Web App overview page
   - Look for **"URL"** field (near the top)
   - It will be something like: `https://happy-beach-0a1b2c3d4.2.azurestaticapps.net`
   - Click on it to test!

2. **Test Your Frontend**
   - Click the URL
   - Your BeamLab frontend should load! 🎉
   - You may see connection errors (that's expected - we haven't deployed backends yet)

**Troubleshooting:**
- ❌ **Build Failed** → Check GitHub Actions logs for errors
- ❌ **404 Error** → Wrong app location or output location
- ❌ **Blank Page** → Check browser console (F12) for errors
- ❌ **Can't authorize GitHub** → Check popup blockers

**✅ Success Criteria:**
- Static Web App shows "Succeeded" status
- You can access the URL
- Frontend loads (even with API errors)
- You see the BeamLab UI

---

## STEP 4: DEPLOY NODE.JS BACKEND (AZURE APP SERVICE)

**Estimated Time:** 20-25 minutes

### 4.1 Create App Service

1. **Navigate to Create Resource**
   - In Azure Portal ([portal.azure.com](https://portal.azure.com))
   - Click **"Create a resource"** (+ icon, top left)
   - Search: **"Web App"**
   - Click **"Web App"** → Click **"Create"**

### 4.2 Configure Basic Settings

**On the "Basics" tab:**

1. **Project Details**
   
   | Field | What to Enter | Notes |
   |-------|---------------|-------|
   | **Subscription** | Azure for Students | Same as before |
   | **Resource Group** | Select **beamlab-rg** | Same group as frontend |

2. **Instance Details**
   
   | Field | What to Enter | Important! |
   |-------|---------------|------------|
   | **Name** | `beamlab-backend-nodejs` | This becomes your URL: `beamlab-backend-nodejs.azurewebsites.net` |
   | **Publish** | **Code** | NOT Docker Container |
   | **Runtime stack** | **Node 20 LTS** | Match your package.json version |
   | **Operating System** | **Linux** | Required for free tier |
   | **Region** | **Southeast Asia** | Same region as frontend |

3. **Pricing Plan**
   
   | Field | What to Select | Critical for Free Tier! |
   |-------|----------------|-------------------------|
   | **Linux Plan** | Click "Create new" | Enter name: `beamlab-free-plan` |
   | **Pricing plan** | Click **"Explore pricing plans"** | Opens a sidebar |

   **In the pricing plans sidebar:**
   1. Look for **"Dev / Test"** tab
   2. Select **"F1"** (the Free tier)
      - Shows: "1 GB memory, 60 minutes/day compute"
      - **Cost: FREE** (₹0.00/month)
   3. Click **"Select"** button at bottom

   **⚠️ VERY IMPORTANT:**
   - Do NOT select B1, P1V2, or any other tier
   - Only **F1** is free
   - You get 10 free F1 apps with Student Pack

### 4.3 Configure Deployment

1. **Click "Next: Deployment >"** (bottom of page)

2. **On the "Deployment" tab:**
   
   **GitHub Actions settings:**
   
   | Field | What to Select |
   |-------|----------------|
   | **Continuous deployment** | **Enable** |
   | **GitHub account** | Click "Authorize" if needed, then select your account |
   | **Organization** | Your GitHub username |
   | **Repository** | `beamlab-ultimate` |
   | **Branch** | `main` |

   **What this does:**
   - Azure creates a GitHub Actions workflow
   - Every push to `main` automatically deploys
   - You don't need to deploy manually

### 4.4 Skip Optional Sections

1. **Click "Next: Networking >"** → Leave defaults
2. **Click "Next: Monitoring >"** → Leave defaults
3. **Click "Next: Tags >"** → Skip

### 4.5 Review and Create

1. **Click "Review + create"**

2. **Verify these settings:**
   - Name: beamlab-backend-nodejs ✅
   - Runtime: Node 20 LTS ✅
   - Operating System: Linux ✅
   - Pricing: F1 (FREE) ✅
   - GitHub Actions: Enabled ✅

3. **Click "Create"** (blue button)

4. **Wait for creation (1-2 minutes)**
   - You'll see "Deployment in progress"
   - When done, click **"Go to resource"**

### 4.6 Configure Application Settings (Environment Variables)

**Critical Step!** Your backend needs these variables to work.

1. **Navigate to Configuration**
   - On your App Service page
   - Look at left sidebar
   - Under **"Settings"**, click **"Configuration"**

2. **Add Environment Variables**
   
   Click **"+ New application setting"** for each variable below:

   | Name | Value | What it's for |
   |------|-------|---------------|
   | `NODE_ENV` | `production` | Tells Node.js this is production |
   | `PORT` | `8080` | Azure uses port 8080 (do NOT use 6000) |
   | `MONGODB_URI` | `mongodb+srv://beamlab_admin:yLCaEABYdoy5yKYd@cluster0.qiu5szt.mongodb.net/beamlab` | Your MongoDB connection |
   | `CLERK_PUBLISHABLE_KEY` | `pk_test_Y2FwYWJsZS1vd2wtNjYuY2xlcmsuYWNjb3VudHMuZGV2JA` | Clerk authentication |
   | `CLERK_SECRET_KEY` | `sk_test_7MqXdNmcEp22DKExdwWXDDjn7QzMimENVg5GHo3Q3f` | Clerk authentication |
   | `FRONTEND_URL` | `https://happy-beach-0a1b2c3d4.2.azurestaticapps.net` | Replace with YOUR Static Web App URL from Step 3 |
   | `PYTHON_BACKEND_URL` | `https://beamlab-backend-python.azurewebsites.net` | We'll deploy this in Step 5 |

   **How to add each variable:**
   1. Click **"+ New application setting"**
   2. **Name:** Enter the name from table (e.g., `NODE_ENV`)
   3. **Value:** Copy-paste the value from table
   4. Click **"OK"**
   5. Repeat for all 7 variables

3. **Save Configuration**
   - After adding all variables, click **"Save"** (top of page)
   - Click **"Continue"** when warned (app will restart)
   - Wait 30 seconds for restart

### 4.7 Configure Startup Command

Your backend needs a specific command to start.

1. **Still in Configuration page**
   - Look for tabs near top: "Application settings" | "General settings"
   - Click **"General settings"** tab

2. **Scroll to "Stack settings"**
   
   | Field | What to Enter |
   |-------|---------------|
   | **Startup Command** | `cd apps/backend && npm install && npm start` |

   **What this does:**
   1. `cd apps/backend` → Navigate to backend folder
   2. `npm install` → Install dependencies
   3. `npm start` → Start the server

3. **Click "Save"** (top of page)
4. Click **"Continue"** (app restarts again)

### 4.8 Configure CORS (Allow Frontend to Call Backend)

1. **In left sidebar, find "API" section**
2. Click **"CORS"**

3. **Add Allowed Origins:**
   
   Click in the "Allowed Origins" box and add:
   ```
   https://happy-beach-0a1b2c3d4.2.azurestaticapps.net
   ```
   ⚠️ Replace with YOUR frontend URL from Step 3
   
   **Also add (for local development):**
   ```
   http://localhost:8000
   ```

4. **Other Settings:**
   - ☑️ Check **"Enable Access-Control-Allow-Credentials"**
   - Leave "Allowed Origins" as is

5. **Click "Save"** (top of page)

### 4.9 Wait for Deployment

1. **Check Deployment Status**
   
   **Option A - Azure Portal:**
   - On your App Service page
   - Left sidebar → **"Deployment"** section → **"Deployment Center"**
   - You'll see logs of the deployment
   - Wait for **"Deployment successful"** ✅

   **Option B - GitHub Actions:**
   - Go to your GitHub repo
   - Click **"Actions"** tab
   - You'll see a workflow: "Build and deploy Node.js app to Azure Web App"
   - Click it to see progress
   - Wait for green checkmarks on all steps

2. **Typical deployment time: 3-5 minutes**

### 4.10 Test Your Backend

1. **Get Your Backend URL**
   - On App Service overview page
   - Look for **"Default domain"**
   - It will be: `https://beamlab-backend-nodejs.azurewebsites.net`

2. **Test Health Endpoint**
   
   Open in browser:
   ```
   https://beamlab-backend-nodejs.azurewebsites.net/health
   ```
   
   **Expected response:**
   ```json
   {
     "status": "OK",
     "timestamp": "2024-01-15T10:30:00.000Z"
   }
   ```

3. **Test API Endpoint**
   
   Try this endpoint:
   ```
   https://beamlab-backend-nodejs.azurewebsites.net/api/templates
   ```
   
   **Should return:** List of beam templates (JSON array)

**Troubleshooting:**

❌ **"Application Error"**
- Check Application Settings → Verify all 7 environment variables are correct
- Check Startup Command → Should be: `cd apps/backend && npm install && npm start`
- Check Logs: Left sidebar → Monitoring → Log stream

❌ **"Cannot connect to MongoDB"**
- Verify MONGODB_URI is correct (no extra spaces)
- Check MongoDB Atlas → Network Access → Add `0.0.0.0/0` (allow all)

❌ **"Module not found" errors**
- Startup command might be wrong
- Should navigate to `apps/backend` folder first

❌ **CORS errors in browser console**
- Add your frontend URL to CORS settings
- Make sure "Allow Credentials" is checked

❌ **App keeps restarting**
- Check Log stream for crash errors
- Verify PORT is set to `8080` (not 6000)

**✅ Success Criteria:**
- App Service shows "Running" status
- `/health` endpoint returns JSON
- `/api/templates` returns data
- No errors in Log stream
- GitHub Actions deployment succeeded

---

## STEP 5: DEPLOY PYTHON BACKEND (AZURE APP SERVICE)

**Estimated Time:** 20-25 minutes

### 5.1 Create App Service for Python

1. **Navigate to Create Resource**
   - In Azure Portal ([portal.azure.com](https://portal.azure.com))
   - Click **"Create a resource"** (+ icon)
   - Search: **"Web App"**
   - Click **"Web App"** → Click **"Create"**

### 5.2 Configure Basic Settings

**On the "Basics" tab:**

1. **Project Details**
   
   | Field | What to Enter |
   |-------|---------------|
   | **Subscription** | Azure for Students |
   | **Resource Group** | Select **beamlab-rg** (same as before) |

2. **Instance Details**
   
   | Field | What to Enter | Important! |
   |-------|---------------|------------|
   | **Name** | `beamlab-backend-python` | Your URL: `beamlab-backend-python.azurewebsites.net` |
   | **Publish** | **Code** | NOT Docker |
   | **Runtime stack** | **Python 3.11** | Match requirements.txt |
   | **Operating System** | **Linux** | Required for free tier |
   | **Region** | **Southeast Asia** | Same as other services |

3. **Pricing Plan**
   
   | Field | What to Select |
   |-------|----------------|
   | **Linux Plan** | Select **beamlab-free-plan** | Reuse the plan from Step 4! |
   | **Pricing plan** | Already set to **F1 (Free)** | ✅ |

   **Why reuse the plan?**
   - You can host multiple apps on one Free F1 plan
   - Saves resources
   - Both share the 60 min/day compute time

### 5.3 Configure Deployment

1. **Click "Next: Deployment >"**

2. **On the "Deployment" tab:**
   
   | Field | What to Select |
   |-------|----------------|
   | **Continuous deployment** | **Enable** |
   | **GitHub account** | Your account (already authorized) |
   | **Organization** | Your GitHub username |
   | **Repository** | `beamlab-ultimate` |
   | **Branch** | `main` |

### 5.4 Review and Create

1. **Click "Next: Networking >"** → Leave defaults
2. **Click "Next: Monitoring >"** → Leave defaults
3. **Click "Review + create"**

4. **Verify:**
   - Name: beamlab-backend-python ✅
   - Runtime: Python 3.11 ✅
   - Pricing: F1 (Free) ✅

5. **Click "Create"**

6. **Wait for creation (1-2 minutes)**
   - Click **"Go to resource"** when done

### 5.5 Configure Application Settings

1. **Navigate to Configuration**
   - Left sidebar → **"Configuration"**

2. **Add Environment Variables**
   
   Click **"+ New application setting"** for each:

   | Name | Value | What it's for |
   |------|-------|---------------|
   | `GOOGLE_AI_API_KEY` | `AIzaSyDFYavn0QKWTJ8OjQkoe8IalmQijA6BRhw` | Google Gemini API |
   | `NODE_BACKEND_URL` | `https://beamlab-backend-nodejs.azurewebsites.net` | Your Node.js backend from Step 4 |
   | `FRONTEND_URL` | `https://happy-beach-0a1b2c3d4.2.azurestaticapps.net` | Replace with YOUR frontend URL |
   | `PORT` | `8000` | Python FastAPI port |

3. **Save Configuration**
   - Click **"Save"** (top)
   - Click **"Continue"** (app restarts)

### 5.6 Configure Startup Command

1. **Still in Configuration**
   - Click **"General settings"** tab

2. **Startup Command:**
   
   | Field | What to Enter |
   |-------|---------------|
   | **Startup Command** | `cd apps/backend-python && pip install -r requirements.txt && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000` |

   **What this does:**
   1. `cd apps/backend-python` → Navigate to Python backend folder
   2. `pip install -r requirements.txt` → Install dependencies
   3. `gunicorn -w 4 -k uvicorn.workers.UvicornWorker` → Production server with 4 workers
   4. `main:app` → Run FastAPI app from main.py
   5. `--bind 0.0.0.0:8000` → Listen on port 8000

3. **Click "Save"**
4. Click **"Continue"**

### 5.7 Configure CORS

1. **Left sidebar → "CORS"**

2. **Add Allowed Origins:**
   ```
   https://happy-beach-0a1b2c3d4.2.azurestaticapps.net
   ```
   Replace with YOUR frontend URL
   
   **Also add:**
   ```
   http://localhost:8000
   ```

3. **Enable:**
   - ☑️ **"Enable Access-Control-Allow-Credentials"**

4. **Click "Save"**

### 5.8 Wait for Deployment

**Check Status:**

**Option A - Azure:**
- Left sidebar → **"Deployment Center"**
- Wait for **"Deployment successful"** ✅

**Option B - GitHub:**
- Go to your repo → **"Actions"** tab
- Look for "Build and deploy Python app to Azure Web App"
- Wait for green checkmarks

**Typical time: 5-7 minutes** (Python installs take longer)

### 5.9 Test Python Backend

1. **Get Your Python Backend URL**
   - Overview page → **"Default domain"**
   - Will be: `https://beamlab-backend-python.azurewebsites.net`

2. **Test Root Endpoint**
   
   Open in browser:
   ```
   https://beamlab-backend-python.azurewebsites.net/
   ```
   
   **Expected response:**
   ```json
   {
     "message": "BeamLab AI API",
     "version": "1.0.0",
     "status": "running"
   }
   ```

3. **Test AI Endpoint**
   
   **Using curl (Terminal):**
   ```bash
   curl -X POST https://beamlab-backend-python.azurewebsites.net/api/ai/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "beamType": "simply-supported",
       "length": 10,
       "loads": [{"type": "point", "value": 50, "position": 5}]
     }'
   ```
   
   **Should return:** AI analysis with recommendations

4. **Test Health Check**
   ```
   https://beamlab-backend-python.azurewebsites.net/health
   ```
   
   **Should return:**
   ```json
   {
     "status": "healthy",
     "ai_service": "connected"
   }
   ```

**Troubleshooting:**

❌ **"Application Error" or 500**
- Check Logs: Left sidebar → **"Log stream"**
- Common issue: Missing dependencies
- Solution: Verify `requirements.txt` is in `apps/backend-python/`

❌ **"ModuleNotFoundError: No module named 'fastapi'"**
- Startup command might not be installing dependencies
- Check if `requirements.txt` exists
- Verify startup command: `cd apps/backend-python && pip install -r requirements.txt && ...`

❌ **"Google AI API Error"**
- Verify `GOOGLE_AI_API_KEY` is correct
- Check if API key is active in Google AI Studio
- Go to [aistudio.google.com](https://aistudio.google.com) → API Keys

❌ **Import errors (NumPy, SciPy)**
- These are large packages, may timeout during install
- Check Log stream for "pip install" progress
- May need to wait 10+ minutes for first deployment

❌ **Connection timeout**
- Python backend takes longer to cold start (2-3 minutes)
- Refresh the page after waiting
- F1 tier has limited compute time (60 min/day)

**✅ Success Criteria:**
- App Service shows "Running" status
- Root endpoint (`/`) returns JSON
- `/health` returns healthy status
- AI endpoint responds (may take 30 sec first time)
- No Python errors in Log stream
- GitHub Actions deployment succeeded

---

## STEP 6: CONFIGURE CUSTOM DOMAIN

**Estimated Time:** 30-60 minutes (includes DNS propagation)

### 6.1 Understand DNS Basics

**What is DNS?**
- DNS = Domain Name System
- Translates `beamlabultimate.tech` → Azure's IP address
- Like a phonebook for the internet

**Types of DNS Records:**
| Record Type | Purpose | Example |
|-------------|---------|---------|
| **A** | Points domain to IP address | `beamlabultimate.tech` → `20.74.15.120` |
| **CNAME** | Alias for another domain | `www.beamlabultimate.tech` → `frontend.azurestaticapps.net` |
| **TXT** | Verification text | Proves you own the domain |

### 6.2 Add Custom Domain in Azure

1. **Navigate to Your Static Web App**
   - Azure Portal → **beamlab-frontend**
   - Left sidebar → **"Custom domains"** (under Settings)

2. **Start Adding Domain**
   - Click **"+ Add"** button (top)
   - A blade opens: "Add custom domain"

3. **Choose Domain Type**
   - Select **"Custom domain on other DNS"**
   - This means your DNS is managed by get.tech (not Azure DNS)

4. **Enter Your Domain**
   
   | Field | What to Enter |
   |-------|---------------|
   | **Domain name** | `beamlabultimate.tech` |
   | **Hostname record type** | **CNAME** (recommended) |

   **Click "Next"**

5. **Azure Shows DNS Instructions**
   
   You'll see a screen showing DNS records to add. **COPY THESE VALUES:**
   
   Example (yours will be different):
   ```
   Type: CNAME
   Name: @
   Value: happy-beach-0a1b2c3d4.2.azurestaticapps.net
   
   Type: TXT
   Name: _dnsauth
   Value: 1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
   ```
   
   **⚠️ IMPORTANT:** Keep this window open or screenshot these values!

### 6.3 Configure DNS at get.tech

1. **Log in to get.tech**
   - Go to [get.tech](https://get.tech)
   - Click **"Login"** (top right)
   - Enter your credentials

2. **Navigate to DNS Settings**
   - After login, find **"My Domains"** or **"Domain List"**
   - Click on **beamlabultimate.tech**
   - Look for **"Manage DNS"** or **"DNS Settings"**
   - Click it

3. **Add CNAME Record (for main domain)**
   
   Click **"Add Record"** or **"Add DNS Record"**
   
   | Field | Value | Notes |
   |-------|-------|-------|
   | **Type** | CNAME | Select from dropdown |
   | **Name** | `@` | @ means root domain |
   | **Value/Target** | `happy-beach-0a1b2c3d4.2.azurestaticapps.net` | YOUR Static Web App URL (no https://) |
   | **TTL** | `3600` or `1 Hour` | Time to live |
   
   **Click "Save"** or **"Add Record"**

4. **Add TXT Record (for verification)**
   
   Click **"Add Record"** again
   
   | Field | Value |
   |-------|-------|
   | **Type** | TXT |
   | **Name** | `_dnsauth` |
   | **Value** | `1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p` (your verification code from Azure) |
   | **TTL** | `3600` |
   
   **Click "Save"**

5. **Add CNAME for www subdomain** (optional but recommended)
   
   Click **"Add Record"** again
   
   | Field | Value |
   |-------|-------|
   | **Type** | CNAME |
   | **Name** | `www` |
   | **Value** | `happy-beach-0a1b2c3d4.2.azurestaticapps.net` |
   | **TTL** | `3600` |
   
   **Click "Save"**

6. **Review Your DNS Records**
   
   You should now see:
   ```
   Type    Name        Value
   ─────────────────────────────────────────────────────
   CNAME   @           happy-beach-0a1b2c3d4.2.azurestaticapps.net
   CNAME   www         happy-beach-0a1b2c3d4.2.azurestaticapps.net
   TXT     _dnsauth    1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
   ```

### 6.4 Verify Domain in Azure

1. **Go Back to Azure Portal**
   - The "Add custom domain" window should still be open
   - If closed, go to Static Web App → Custom domains → Click "+ Add" again

2. **Click "Validate"**
   - Azure will check if TXT record exists
   - This may fail initially (DNS not propagated yet)

3. **Wait for DNS Propagation**
   
   **How long?**
   - Minimum: 10 minutes
   - Average: 30 minutes
   - Maximum: 72 hours (rare)
   
   **Check propagation status:**
   - Open [dnschecker.org](https://dnschecker.org)
   - Enter: `beamlabultimate.tech`
   - Select **"CNAME"** from dropdown
   - Click **"Search"**
   - You'll see a world map showing which DNS servers see your change
   - Wait until most are green ✅

4. **Click "Add" in Azure**
   - Once DNS propagates, click **"Add"** button
   - Azure will verify and add your domain
   - You'll see "Custom domain added successfully" ✅

### 6.5 Enable HTTPS (Free SSL Certificate)

**Azure automatically provisions a free SSL certificate!**

1. **Check SSL Status**
   - In **Custom domains** page
   - Look at your domain: `beamlabultimate.tech`
   - Status should show:
     - "Validating..." (initial)
     - "Provisioning certificate..." (5-10 min)
     - "Secured" with a lock icon 🔒 (done!)

2. **Wait for Certificate**
   - Takes 5-15 minutes
   - Azure uses Let's Encrypt (trusted, free)
   - Auto-renews every 90 days

### 6.6 Test Your Custom Domain

1. **Open Your Domain**
   - Go to: `https://beamlabultimate.tech`
   - Should load your BeamLab app! 🎉

2. **Test www Subdomain**
   - Go to: `https://www.beamlabultimate.tech`
   - Should also work

3. **Check HTTPS**
   - Click the lock icon 🔒 in browser address bar
   - Should say "Connection is secure"
   - Certificate issued by "Let's Encrypt"

### 6.7 Update Backend CORS

**Important!** Your backends still only allow the old `.azurestaticapps.net` domain.

1. **Update Node.js Backend CORS**
   - Azure Portal → **beamlab-backend-nodejs**
   - Left sidebar → **"CORS"**
   - Click **"+ Add allowed origin"**
   - Add:
     ```
     https://beamlabultimate.tech
     ```
   - Also add:
     ```
     https://www.beamlabultimate.tech
     ```
   - Click **"Save"**

2. **Update Python Backend CORS**
   - Repeat same steps for **beamlab-backend-python**
   - Add both URLs to allowed origins
   - Click **"Save"**

### 6.8 Update Environment Variables

**Optional:** Update frontend to use custom domain references

1. **Go to beamlab-frontend in Azure**
2. **Configuration** → **Application settings**
3. If you have `API_URL` variables, update them
4. Click **"Save"**

**Troubleshooting:**

❌ **"Domain validation failed"**
- DNS records not propagated yet → Wait 30 more minutes
- Wrong TXT value → Copy exact value from Azure (no spaces)
- Check DNS at [dnschecker.org](https://dnschecker.org)

❌ **"CNAME conflict"**
- Remove any existing A or AAAA records for `@`
- Can only have CNAME or A, not both

❌ **"www not working"**
- Add separate CNAME record for `www`
- Point to same `.azurestaticapps.net` URL

❌ **"Not Secure" warning in browser**
- SSL certificate still provisioning
- Wait 15 minutes
- Check Custom domains page for "Secured" status

❌ **Site loads but API calls fail**
- CORS not updated
- Add custom domain to both backends' CORS settings

**✅ Success Criteria:**
- `https://beamlabultimate.tech` loads your app
- `https://www.beamlabultimate.tech` also works
- Browser shows 🔒 lock (HTTPS)
- No certificate warnings
- All API calls work (check browser console, F12)

---

## STEP 7: SET UP GITHUB ACTIONS (AUTO-DEPLOYMENT)

**Estimated Time:** 15-20 minutes

**Good News:** Azure already created GitHub Actions workflows in Steps 3, 4, and 5!

This step verifies they're working and shows you how to add missing secrets if needed.

### 7.1 Verify Existing Workflows

1. **Go to Your GitHub Repository**
   - Navigate to: `https://github.com/YOUR_USERNAME/beamlab-ultimate`
   - Click **"Actions"** tab (top navigation)

2. **Check Workflow Files**
   
   You should see these workflows:
   ```
   ✅ Azure Static Web Apps CI/CD
   ✅ Build and deploy Node.js app to Azure Web App - beamlab-backend-nodejs
   ✅ Build and deploy Python app to Azure Web App - beamlab-backend-python
   ```

3. **View Workflow Files in Repo**
   - Click **"Code"** tab
   - Navigate to `.github/workflows/`
   - You'll see 3-4 YAML files (auto-created by Azure)

### 7.2 Understand GitHub Secrets

**What are GitHub Secrets?**
- Secure storage for sensitive data (API keys, passwords)
- Used in workflows but never visible in logs
- Stored encrypted

**How to Access:**
1. Your GitHub repo → **Settings** tab
2. Left sidebar → **"Secrets and variables"** → **"Actions"**
3. You'll see **"Repository secrets"** section

### 7.3 Add Missing Secrets

**Azure auto-created some secrets, but you may need to add others.**

1. **Click "New repository secret"**

2. **Add Each Secret Below:**

   **For Frontend Build:**
   
   | Secret Name | Value | Where to Get It |
   |-------------|-------|-----------------|
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_Y2FwYWJsZS1vd2wtNjYuY2xlcmsuYWNjb3VudHMuZGV2JA` | From Step 1 or Clerk Dashboard |

   **For Static Web App Deployment (if missing):**
   
   | Secret Name | Value | Where to Get It |
   |-------------|-------|-----------------|
   | `AZURE_STATIC_WEB_APPS_API_TOKEN` | `<deployment-token>` | See 7.4 below |

   **How to add:**
   1. Click **"New repository secret"**
   2. **Name:** Enter exact name from table (e.g., `VITE_CLERK_PUBLISHABLE_KEY`)
   3. **Secret:** Paste the value
   4. Click **"Add secret"**

### 7.4 Get Azure Static Web Apps Deployment Token

**Only needed if the secret is missing!**

1. **Azure Portal**
   - Go to **beamlab-frontend** (Static Web App)
   - Left sidebar → **"Overview"**
   
2. **Get Deployment Token**
   - Click **"Manage deployment token"** (top buttons)
   - A panel opens showing a long token
   - Click **"Copy"** icon
   
3. **Add to GitHub**
   - GitHub → Your repo → Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Secret: Paste the token
   - Add secret

### 7.5 Get App Service Publish Profiles

**Only needed if Azure didn't auto-configure deployment!**

**For Node.js Backend:**

1. **Azure Portal**
   - Go to **beamlab-backend-nodejs**
   - Top toolbar → Click **"Get publish profile"**
   - A `.publishsettings` XML file downloads

2. **Open the File**
   - Open with text editor (Notepad, VS Code)
   - **Select ALL text** (Ctrl+A / Cmd+A)
   - **Copy** (Ctrl+C / Cmd+C)

3. **Add to GitHub**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE_NODEJS`
   - Secret: Paste the entire XML content
   - Add secret

**For Python Backend:**

Repeat the same process:
1. Go to **beamlab-backend-python**
2. Click **"Get publish profile"**
3. Open file, copy all text
4. Add as secret: `AZURE_WEBAPP_PUBLISH_PROFILE_PYTHON`

### 7.6 Verify All Required Secrets

**Check your secrets list. You should have:**

```
✅ AZURE_STATIC_WEB_APPS_API_TOKEN
✅ AZURE_WEBAPP_PUBLISH_PROFILE_NODEJS  (or auto-created as <APPNAME>_PUBLISHPROFILE)
✅ AZURE_WEBAPP_PUBLISH_PROFILE_PYTHON   (or auto-created as <APPNAME>_PUBLISHPROFILE)
✅ VITE_CLERK_PUBLISHABLE_KEY
```

**Note:** Azure may have created secrets with different names like:
- `AZUREAPPSERVICE_PUBLISHPROFILE_<RANDOM_ID>`

That's fine! Check your workflow YAML files to see what names they use.

### 7.7 Test Auto-Deployment

**Make a small change to trigger deployment:**

1. **Edit README.md**
   
   In VS Code (or GitHub web editor):
   ```bash
   cd /Users/rakshittiwari/Desktop/new/beamlab-ultimate
   ```
   
   Open `README.md`, add a line:
   ```markdown
   ## Deployment Status
   Last updated: January 2025
   ```

2. **Commit and Push**
   ```bash
   git add README.md
   git commit -m "Test auto-deployment"
   git push origin main
   ```

3. **Watch GitHub Actions**
   - Go to GitHub → **Actions** tab
   - You'll see 3 workflows start running:
     - Azure Static Web Apps CI/CD
     - Build and deploy Node.js app
     - Build and deploy Python app
   - Click on each to see live logs

4. **Wait for Completion**
   - Each workflow shows steps executing
   - Green checkmarks ✅ = success
   - Red X ❌ = failure (click to see error)
   - Typical time: 5-10 minutes total

5. **Verify Deployment**
   - After all workflows succeed
   - Visit: `https://beamlabultimate.tech`
   - Changes should be live!

### 7.8 Understanding Workflow Files

**Optional:** Let's look at what Azure created

1. **Frontend Workflow**
   - File: `.github/workflows/azure-static-web-apps-<random>.yml`
   - Triggers on: Push to `main` branch
   - Steps:
     1. Checkout code
     2. Install Node.js
     3. Build app (`npm install && npm run build`)
     4. Deploy to Azure Static Web Apps

2. **Node.js Backend Workflow**
   - File: `.github/workflows/main_beamlab-backend-nodejs.yml` (or similar)
   - Triggers on: Push to `main` branch
   - Steps:
     1. Checkout code
     2. Set up Node.js 20
     3. Install dependencies
     4. Build (if needed)
     5. Deploy to Azure App Service

3. **Python Backend Workflow**
   - File: `.github/workflows/main_beamlab-backend-python.yml` (or similar)
   - Triggers on: Push to `main` branch
   - Steps:
     1. Checkout code
     2. Set up Python 3.11
     3. Install dependencies
     4. Deploy to Azure App Service

**You can edit these files to customize the build process!**

**Troubleshooting:**

❌ **Workflow fails with "secrets not found"**
- Check secret names match the workflow file
- Secrets are case-sensitive: `VITE_API_URL` ≠ `vite_api_url`
- Re-create the secret with exact name

❌ **Build fails: "Module not found"**
- Check `package.json` dependencies
- Workflow might need to run `npm install` before `npm build`
- Check working directory in workflow file

❌ **Deployment succeeds but app doesn't update**
- Check Azure App Service logs
- Verify deployment actually ran (check timestamps)
- Try manually restarting App Service

❌ **"Permission denied" during deployment**
- Publish profile might be expired
- Re-download publish profile from Azure
- Update GitHub secret with new profile

❌ **Frontend builds but APIs fail**
- Environment variables not passed during build
- Add `env:` section to workflow with `VITE_*` variables
- Or add them as GitHub Secrets

**✅ Success Criteria:**
- All 3 workflows complete successfully ✅
- Pushing code triggers automatic deployment
- Changes appear on live site within 10 minutes
- No red X's in Actions tab
- All GitHub Secrets are configured

---

## 🔍 TROUBLESHOOTING

### Frontend Not Showing

**Problem:** Getting 404 or blank page

**Solution:**
1. Check GitHub Actions → Workflows → View logs
2. Verify `apps/frontend/dist` folder exists
3. Check build command: `npm install && npm run build`
4. Check DNS propagation: `nslookup beamlabultimate.tech`

### Backend API Errors

**Problem:** 502 Bad Gateway or connection refused

**Solution:**
1. Check App Service logs: **Log stream** in Azure
2. Verify environment variables are set
3. Check startup command syntax
4. Verify PORT is set to `8080`
5. Check MongoDB connection string

### CORS Errors

**Problem:** Browser console shows CORS error

**Solution:**

Update your backends to allow frontend origin:

**apps/backend/src/server.ts:**
```typescript
const corsOptions = {
  origin: [
    'http://localhost:8000',
    'https://beamlabultimate.tech',
    'https://www.beamlabultimate.tech'
  ],
  credentials: true
};
app.use(cors(corsOptions));
```

**apps/backend-python/main.py:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "https://beamlabultimate.tech",
        "https://www.beamlabultimate.tech",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Database Connection Issues

**Problem:** Connection timeout to MongoDB

**Solution:**
1. Check MongoDB Atlas IP whitelist
2. Verify connection string format
3. Add `?retryWrites=true&w=majority` to URI
4. Test locally first with same credentials

---

## 💰 COST BREAKDOWN

### Current (With Student Pack)

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| **Frontend** | Static Web Apps (Free) | **$0** |
| **Node.js API** | App Service F1 | **$0** |
| **Python AI** | App Service F1 | **$0** |
| **Database** | MongoDB Atlas M0 | **$0** |
| **Authentication** | Clerk (10K MAUs) | **$0** |
| **AI** | Google Gemini Free | **$0** |
| **TOTAL** | | **$0/month** |

**Additional Benefits:** $100 Azure credit

### After Student Pack Expires (Optional)

If you want to continue after 1 year:

| Service | Cost |
|---------|------|
| App Service B1 (Standard) | ~$13/month |
| MongoDB Atlas M2 (1GB) | ~$57/month |
| Static Web Apps | $0 (always free) |
| **Total** | ~$70/month |

But with $100 credit, you have 14+ months covered!

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] GitHub Student Pack activated
- [ ] Azure account created with $100 credit
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] Clerk project with keys
- [ ] Google AI key obtained
- [ ] Azure Static Web App created
- [ ] Azure App Service (Node.js) created
- [ ] Azure App Service (Python) created
- [ ] Environment variables set
- [ ] Startup commands configured
- [ ] GitHub Actions secrets added
- [ ] Custom domain added
- [ ] DNS records configured
- [ ] SSL certificate active (automatic)
- [ ] CORS configured in backends
- [ ] Test all endpoints
- [ ] App live at beamlabultimate.tech ✅

---

## 🔗 USEFUL LINKS

- [Azure for Students](https://azure.microsoft.com/en-us/free/students/)
- [Azure Portal](https://portal.azure.com)
- [GitHub Student Pack](https://education.github.com/pack)
- [MongoDB Atlas](https://cloud.mongodb.com)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [Google AI Studio](https://aistudio.google.com)

---

## 🎉 YOU'RE DONE!

Your BeamLab app is now live at **https://beamlabultimate.tech**

**Every push to main automatically deploys everything!**

For support, open an issue on GitHub or check the logs in Azure Portal.
