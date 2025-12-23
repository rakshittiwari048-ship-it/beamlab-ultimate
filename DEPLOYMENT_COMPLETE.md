# Complete Azure Deployment Guide

## ✅ Already Completed

1. **Azure Resources Provisioned**:
   - Resource Group: `beamlab-ci-rg` (Central India)
   - Static Web App: `beamlab-frontend` (East Asia)
   - App Service Plan: `beamlab-ci-plan` (F1 Free, Central India)
   - Node Web App: `beamlab-backend-node` (Node 20)
   - Python Web App: `beamlab-backend-python` (Python 3.11)

2. **Frontend Deployed**:
   - URL: https://brave-mushroom-0eae8ec00-preview.eastasia.4.azurestaticapps.net
   - Environment configured for Azure endpoints

3. **GitHub Actions Workflows Created**:
   - Node backend: `.github/workflows/deploy-node-backend.yml`
   - Python backend: `.github/workflows/deploy-python-backend.yml`

4. **Publish Profiles Downloaded**:
   - Node: `/tmp/node-publish-profile.xml`
   - Python: `/tmp/python-publish-profile.xml`

---

## 🚀 Steps to Complete Deployment

### Step 1: Create GitHub Repository

```bash
# Go to GitHub.com and create a new repository (e.g., "beamlab-ultimate")
# Then run these commands:

cd /Users/rakshittiwari/Desktop/new/beamlab-ultimate

# Remove Azure remote, add GitHub remote
git remote remove azure
git remote add origin https://github.com/YOUR_USERNAME/beamlab-ultimate.git

# Push code to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **AZURE_WEBAPP_PUBLISH_PROFILE_NODE**
   ```bash
   # Copy the content of /tmp/node-publish-profile.xml
   cat /tmp/node-publish-profile.xml | pbcopy
   # Paste into GitHub secret
   ```

2. **AZURE_WEBAPP_PUBLISH_PROFILE_PYTHON**
   ```bash
   # Copy the content of /tmp/python-publish-profile.xml
   cat /tmp/python-publish-profile.xml | pbcopy
   # Paste into GitHub secret
   ```

### Step 3: Configure Azure App Settings

Run these commands to set environment variables:

```bash
# Node Backend Settings
az webapp config appsettings set \
  --resource-group beamlab-ci-rg \
  --name beamlab-backend-node \
  --settings \
    NODE_ENV=production \
    MONGODB_URI="mongodb+srv://beamlab_admin:yLCaEABYdoy5yKYd@cluster0.qiu5szt.mongodb.net/beamlab?retryWrites=true&w=majority" \
    FRONTEND_URL="https://brave-mushroom-0eae8ec00.4.azurestaticapps.net" \
    CLERK_PUBLISHABLE_KEY="pk_test_Y2FwYWJsZS1vd2wtNjYuY2xlcmsuYWNjb3VudHMuZGV2JA" \
    CLERK_SECRET_KEY="sk_test_7MqXdNmcEp22DKExdwWXDDjn7QzMimENVg5GHo3Q3f" \
    GOOGLE_AI_API_KEY="AIzaSyDFYavn0QKWTJ8OjQkoe8IalmQijA6BRhw" \
    PYTHON_API_URL="https://beamlab-backend-python.azurewebsites.net"

# Python Backend Settings
az webapp config appsettings set \
  --resource-group beamlab-ci-rg \
  --name beamlab-backend-python \
  --settings \
    FRONTEND_URL="https://brave-mushroom-0eae8ec00.4.azurestaticapps.net" \
    USE_MOCK_AI=true \
    GOOGLE_AI_API_KEY="AIzaSyDFYavn0QKWTJ8OjQkoe8IalmQijA6BRhw"
```

### Step 4: Trigger Deployment

Option A: Push a change to trigger workflows
```bash
cd /Users/rakshittiwari/Desktop/new/beamlab-ultimate
git commit --allow-empty -m "trigger: Deploy to Azure"
git push
```

Option B: Manually trigger from GitHub Actions tab

### Step 5: Verify Deployments

Once GitHub Actions complete:

```bash
# Test Node backend
curl https://beamlab-backend-node.azurewebsites.net/health

# Test Python backend
curl https://beamlab-backend-python.azurewebsites.net/health

# Test frontend
open https://brave-mushroom-0eae8ec00-preview.eastasia.4.azurestaticapps.net
```

---

## 🔧 Alternative: Manual Deployment (If GitHub Actions Not Preferred)

### For Node Backend:
```bash
cd /Users/rakshittiwari/Desktop/new/beamlab-ultimate/deploy/backend-prod
npm install --production
cd ../..
zip -r backend-node-final.zip deploy/backend-prod/

# Deploy via CLI
az webapp deploy \
  --resource-group beamlab-ci-rg \
  --name beamlab-backend-node \
  --src-path backend-node-final.zip \
  --type zip
```

### For Python Backend (Minimal Mode):
The F1 tier struggles with PyNite. Consider:
1. Remove PyNite from requirements.txt temporarily
2. Deploy simpler version with only beam solver
3. OR upgrade to B1 Basic tier ($13.14/mo, covered by student credits):

```bash
az appservice plan update \
  --resource-group beamlab-ci-rg \
  --name beamlab-ci-plan \
  --sku B1
```

---

## 📝 Deployment URLs

- **Frontend**: https://brave-mushroom-0eae8ec00-preview.eastasia.4.azurestaticapps.net
- **Node Backend**: https://beamlab-backend-node.azurewebsites.net
- **Python Backend**: https://beamlab-backend-python.azurewebsites.net

---

## 🐛 Troubleshooting

### Node Backend Not Starting
- Check logs: `az webapp log tail --resource-group beamlab-ci-rg --name beamlab-backend-node`
- Verify node_modules installed: GitHub Actions workflow handles this
- Check startup command: Should be `node dist/server.js`

### Python Backend 503
- F1 tier memory too low for PyNite
- Solution: Upgrade to B1 or deploy minimal version

### CORS Errors
- Verify FRONTEND_URL is set correctly in both backends
- Check server.ts ALLOWED_ORIGINS includes Static Web App URL

---

## 🎯 Next Steps After Deployment

1. Test full workflow: Create beam → Analyze → View results
2. Set up custom domain (optional)
3. Enable production environment for Static Web App
4. Monitor costs in Azure Portal
5. Set up CI/CD for automatic deployments on push
