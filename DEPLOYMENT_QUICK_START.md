# 🚀 Quick Deployment Guide

## Prerequisites Checklist
- [ ] GitHub Student Pack activated at [education.github.com/pack](https://education.github.com/pack)
- [ ] Azure account created at [portal.azure.com](https://portal.azure.com)
- [ ] Git installed and configured
- [ ] Code pushed to GitHub

## Step-by-Step Deployment

### 1️⃣ Push to GitHub (5 minutes)

```bash
cd /Users/rakshittiwari/Desktop/new/beamlab-ultimate

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/beamlab-ultimate.git

# Push code
git add -A
git commit -m "Initial commit - Ready for Azure deployment"
git push -u origin main
```

**Need Personal Access Token?**
- GitHub.com → Settings → Developer settings → Personal access tokens → Generate new token
- Select `repo` scope
- Use token as password when pushing

---

### 2️⃣ Deploy Frontend - Azure Static Web Apps (15 minutes)

1. **Azure Portal** → Create a resource → "Static Web App"
2. **Configure:**
   - Name: `beamlab-frontend`
   - Plan: **Free**
   - Region: Southeast Asia
   - Source: **GitHub** (authorize)
   - Repository: `beamlab-ultimate`
   - Branch: `main`
   - App location: `/apps/frontend`
   - Output location: `dist`
3. **Create** → Wait 5 minutes
4. **Copy URL:** `https://happy-beach-xxx.azurestaticapps.net`

---

### 3️⃣ Deploy Node.js Backend - App Service (20 minutes)

1. **Azure Portal** → Create a resource → "Web App"
2. **Configure:**
   - Name: `beamlab-backend-nodejs`
   - Runtime: **Node 20 LTS**
   - OS: **Linux**
   - Plan: **F1 (Free)**
   - Enable GitHub Actions: **Yes**
3. **After creation** → Configuration → Application settings:

```
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://beamlab_admin:yLCaEABYdoy5yKYd@cluster0.qiu5szt.mongodb.net/beamlab
CLERK_PUBLISHABLE_KEY=pk_test_Y2FwYWJsZS1vd2wtNjYuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_SECRET_KEY=sk_test_7MqXdNmcEp22DKExdwWXDDjn7QzMimENVg5GHo3Q3f
FRONTEND_URL=https://happy-beach-xxx.azurestaticapps.net
PYTHON_BACKEND_URL=https://beamlab-backend-python.azurewebsites.net
```

4. **General settings** → Startup Command:
```bash
cd apps/backend && npm install && npm start
```

5. **CORS** → Add allowed origins:
```
https://happy-beach-xxx.azurestaticapps.net
http://localhost:8000
```

---

### 4️⃣ Deploy Python Backend - App Service (20 minutes)

1. **Azure Portal** → Create a resource → "Web App"
2. **Configure:**
   - Name: `beamlab-backend-python`
   - Runtime: **Python 3.11**
   - OS: **Linux**
   - Plan: **beamlab-free-plan** (reuse from Step 3)
3. **Configuration** → Application settings:

```
PORT=8000
GOOGLE_AI_API_KEY=AIzaSyDFYavn0QKWTJ8OjQkoe8IalmQijA6BRhw
NODE_BACKEND_URL=https://beamlab-backend-nodejs.azurewebsites.net
FRONTEND_URL=https://happy-beach-xxx.azurestaticapps.net
```

4. **Startup Command:**
```bash
cd apps/backend-python && pip install -r requirements.txt && gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
```

5. **CORS** → Add allowed origins (same as Node.js)

---

### 5️⃣ Custom Domain - get.tech (30 minutes)

1. **Azure** → beamlab-frontend → Custom domains → Add
   - Domain: `beamlabultimate.tech`
   - Copy TXT and CNAME values

2. **get.tech** → DNS Settings → Add records:
   ```
   CNAME  @           happy-beach-xxx.azurestaticapps.net
   CNAME  www         happy-beach-xxx.azurestaticapps.net
   TXT    _dnsauth    <value from Azure>
   ```

3. **Wait 30 minutes** for DNS propagation
4. **Verify** at [dnschecker.org](https://dnschecker.org)
5. **Azure** → Validate → Add domain
6. **Wait 10 minutes** for SSL certificate

---

### 6️⃣ Update CORS for Custom Domain (5 minutes)

**Both backends** → CORS → Add:
```
https://beamlabultimate.tech
https://www.beamlabultimate.tech
```

---

## ✅ Verification

Test these URLs:

- **Frontend:** https://beamlabultimate.tech
- **Node API:** https://beamlab-backend-nodejs.azurewebsites.net/health
- **Python API:** https://beamlab-backend-python.azurewebsites.net/

---

## 🔧 Troubleshooting

**Build fails?**
- Check GitHub Actions logs
- Verify `package.json` scripts

**Backend errors?**
- Check Azure → Log stream
- Verify environment variables
- Check startup command

**CORS errors?**
- Add frontend URL to backend CORS
- Enable "Allow Credentials"

**Database connection fails?**
- MongoDB Atlas → Network Access → Add `0.0.0.0/0`

---

## 📚 Full Guide

For detailed step-by-step instructions with screenshots, see:
**[AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)**

---

## 💰 Cost: $0/month

All services using free tiers + $100 Azure student credit!
