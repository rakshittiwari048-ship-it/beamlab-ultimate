# 📋 Azure Deployment Checklist

Use this checklist to track your deployment progress.

## Phase 1: Prerequisites ✅

- [ ] **GitHub Student Pack**
  - [ ] Applied at [education.github.com/pack](https://education.github.com/pack)
  - [ ] Verified email from GitHub Education
  - [ ] Access granted (check confirmation email)

- [ ] **Azure Account**
  - [ ] Signed up at [portal.azure.com](https://portal.azure.com)
  - [ ] Used .edu email or verified student status
  - [ ] $100 credit visible in subscriptions
  - [ ] NO credit card required ✅

- [ ] **Domain & Services**
  - [ ] get.tech domain purchased: `beamlabultimate.tech`
  - [ ] MongoDB Atlas account created
  - [ ] MongoDB cluster created (M0 Free tier)
  - [ ] Clerk account created
  - [ ] Clerk application created with keys
  - [ ] Google AI Studio account
  - [ ] Google AI API key obtained

---

## Phase 2: Local Setup ✅

- [ ] **Git Configuration**
  - [ ] Git installed
  - [ ] Git configured: `git config --global user.name "Your Name"`
  - [ ] Git configured: `git config --global user.email "you@example.com"`

- [ ] **GitHub Repository**
  - [ ] Repository created: `beamlab-ultimate`
  - [ ] Repository set to Public (required for free GitHub Pages/Actions)
  - [ ] Local code connected to GitHub remote

- [ ] **Environment Variables Set**
  - [ ] `.env` files created for all 3 apps
  - [ ] All credentials added (MongoDB, Clerk, Google AI)
  - [ ] `.env` files added to `.gitignore` (NEVER commit!)

---

## Phase 3: Push to GitHub ✅

- [ ] **Personal Access Token Created**
  - [ ] GitHub → Settings → Developer settings → PAT
  - [ ] Token with `repo` scope
  - [ ] Token saved securely

- [ ] **Code Pushed**
  ```bash
  git add -A
  git commit -m "Initial commit - Azure deployment ready"
  git push -u origin main
  ```
  - [ ] No errors during push
  - [ ] All files visible on GitHub
  - [ ] Verify `.env` files NOT on GitHub

---

## Phase 4: Azure Frontend Deployment ✅

- [ ] **Static Web App Created**
  - [ ] Name: `beamlab-frontend`
  - [ ] Plan: Free (F1)
  - [ ] Region: Southeast Asia
  - [ ] GitHub authorized
  - [ ] Repository connected: `beamlab-ultimate`
  - [ ] Branch: `main`

- [ ] **Build Configuration**
  - [ ] App location: `/apps/frontend`
  - [ ] Output location: `dist`
  - [ ] Build preset: Custom

- [ ] **Deployment Verified**
  - [ ] GitHub Actions workflow created
  - [ ] Workflow ran successfully (green checkmark)
  - [ ] Static Web App URL accessible
  - [ ] Frontend loads (even if APIs fail)
  - [ ] URL saved: `https://_________________.azurestaticapps.net`

---

## Phase 5: Node.js Backend Deployment ✅

- [ ] **App Service Created**
  - [ ] Name: `beamlab-backend-nodejs`
  - [ ] Runtime: Node 20 LTS
  - [ ] OS: Linux
  - [ ] Plan: F1 (Free) ✅
  - [ ] Region: Southeast Asia

- [ ] **Configuration Added**
  - [ ] Environment variables (7 total):
    - [ ] `NODE_ENV=production`
    - [ ] `PORT=8080`
    - [ ] `MONGODB_URI`
    - [ ] `CLERK_PUBLISHABLE_KEY`
    - [ ] `CLERK_SECRET_KEY`
    - [ ] `FRONTEND_URL`
    - [ ] `PYTHON_BACKEND_URL`
  
  - [ ] Startup command: `cd apps/backend && npm install && npm start`
  
  - [ ] CORS configured:
    - [ ] Frontend URL added
    - [ ] `localhost:8000` added
    - [ ] "Allow Credentials" enabled

- [ ] **Deployment Verified**
  - [ ] GitHub Actions workflow succeeded
  - [ ] App Service shows "Running"
  - [ ] Health check works: `/health`
  - [ ] API endpoint works: `/api/templates`
  - [ ] No errors in Log stream

---

## Phase 6: Python Backend Deployment ✅

- [ ] **App Service Created**
  - [ ] Name: `beamlab-backend-python`
  - [ ] Runtime: Python 3.11
  - [ ] OS: Linux
  - [ ] Plan: Reused `beamlab-free-plan`
  - [ ] Region: Southeast Asia

- [ ] **Configuration Added**
  - [ ] Environment variables (4 total):
    - [ ] `PORT=8000`
    - [ ] `GOOGLE_AI_API_KEY`
    - [ ] `NODE_BACKEND_URL`
    - [ ] `FRONTEND_URL`
  
  - [ ] Startup command: `cd apps/backend-python && pip install -r requirements.txt && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000`
  
  - [ ] CORS configured (same as Node.js)

- [ ] **Deployment Verified**
  - [ ] GitHub Actions workflow succeeded
  - [ ] App Service shows "Running"
  - [ ] Root endpoint works: `/`
  - [ ] Health check works: `/health`
  - [ ] AI endpoint responds
  - [ ] No Python errors in logs

---

## Phase 7: Custom Domain Setup ✅

- [ ] **DNS Records Added (get.tech)**
  - [ ] CNAME record: `@ → <static-web-app>.azurestaticapps.net`
  - [ ] CNAME record: `www → <static-web-app>.azurestaticapps.net`
  - [ ] TXT record: `_dnsauth → <verification-code>`

- [ ] **Azure Configuration**
  - [ ] Custom domain added: `beamlabultimate.tech`
  - [ ] Domain validated (TXT record verified)
  - [ ] SSL certificate provisioned (Let's Encrypt)
  - [ ] Domain status shows "Secured" 🔒

- [ ] **CORS Updated**
  - [ ] Both backends have custom domain in CORS:
    - [ ] `https://beamlabultimate.tech`
    - [ ] `https://www.beamlabultimate.tech`

- [ ] **Domain Verified**
  - [ ] `https://beamlabultimate.tech` loads
  - [ ] `https://www.beamlabultimate.tech` loads
  - [ ] Browser shows 🔒 (HTTPS)
  - [ ] No certificate warnings
  - [ ] DNS propagated (check at dnschecker.org)

---

## Phase 8: GitHub Actions Setup ✅

- [ ] **Workflows Verified**
  - [ ] 3 workflows exist in `.github/workflows/`
  - [ ] All workflows enabled
  - [ ] All workflows run on push to `main`

- [ ] **GitHub Secrets Configured**
  - [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN`
  - [ ] `AZURE_WEBAPP_PUBLISH_PROFILE_NODEJS`
  - [ ] `AZURE_WEBAPP_PUBLISH_PROFILE_PYTHON`
  - [ ] `VITE_CLERK_PUBLISHABLE_KEY`

- [ ] **Auto-Deployment Tested**
  - [ ] Made test commit
  - [ ] Pushed to GitHub
  - [ ] All 3 workflows triggered
  - [ ] All workflows succeeded ✅
  - [ ] Changes live on production

---

## Phase 9: Final Testing ✅

- [ ] **Frontend Testing**
  - [ ] Homepage loads
  - [ ] Navigation works
  - [ ] No console errors
  - [ ] All assets load (images, CSS, JS)

- [ ] **Authentication Testing**
  - [ ] Clerk login works
  - [ ] Sign up works
  - [ ] User dashboard accessible
  - [ ] Protected routes work

- [ ] **API Testing**
  - [ ] Create new project
  - [ ] Load templates
  - [ ] Run analysis
  - [ ] AI recommendations work
  - [ ] Data saves to MongoDB

- [ ] **Performance Testing**
  - [ ] Page load < 3 seconds
  - [ ] API response < 2 seconds
  - [ ] No memory leaks
  - [ ] Mobile responsive

---

## Phase 10: Monitoring & Maintenance ✅

- [ ] **Azure Monitoring Setup**
  - [ ] Log stream enabled on both App Services
  - [ ] Application Insights configured (optional)
  - [ ] Alert rules created (optional)

- [ ] **Cost Monitoring**
  - [ ] Azure Cost Management checked
  - [ ] Confirmed $0/month usage
  - [ ] Student credit balance checked

- [ ] **Documentation**
  - [ ] README.md updated with live URL
  - [ ] Deployment guide complete
  - [ ] Environment variables documented
  - [ ] Troubleshooting guide available

---

## 🎉 Success Criteria

Your deployment is complete when:

✅ `https://beamlabultimate.tech` loads without errors  
✅ Users can sign up and log in  
✅ All API endpoints respond correctly  
✅ Auto-deployment works on every push  
✅ SSL certificate shows 🔒 in browser  
✅ No errors in Azure logs  
✅ Cost stays at $0/month  

---

## 📊 Deployment Timeline

Typical deployment time:
- **Phase 1-2:** 30 minutes (prerequisites)
- **Phase 3:** 5 minutes (push to GitHub)
- **Phase 4:** 15 minutes (frontend)
- **Phase 5:** 20 minutes (Node.js backend)
- **Phase 6:** 20 minutes (Python backend)
- **Phase 7:** 60 minutes (custom domain + DNS propagation)
- **Phase 8:** 15 minutes (GitHub Actions)
- **Phase 9:** 15 minutes (testing)

**Total: ~3 hours** (including DNS propagation wait time)

---

## 🆘 Need Help?

- **Stuck?** See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for detailed steps
- **Quick reference?** See [DEPLOYMENT_QUICK_START.md](./DEPLOYMENT_QUICK_START.md)
- **Errors?** Check troubleshooting section in deployment guide
