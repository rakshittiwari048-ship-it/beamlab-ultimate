# 🚀 BeamLab Ultimate - Azure Deployment Guide

## Your Domain: **beamlabultimate.tech** (via get.tech)

### 🎓 Services Being Used

| Service | Purpose | Cost |
|---------|---------|------|
| **Microsoft Azure** | Hosting (Frontend + Backends) | 🆓 $100 student credit |
| **MongoDB Atlas** | Database | 🆓 Free M0 tier |
| **get.tech** | Domain (beamlabultimate.tech) | Already purchased |
| **Clerk** | Authentication | 🆓 Free (10K MAUs) |
| **Google AI Studio** | Gemini API | 🆓 Free tier |
| **GitHub** | Code repository | 🆓 Free |

**Total Monthly Cost: $0** (covered by GitHub Student Pack)

**📚 Complete Azure Guide**: See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)

---

## 📋 TABLE OF CONTENTS

1. [Overview & Architecture](#1-overview--architecture)
2. [Prerequisites](#2-prerequisites)
3. [Quick Deployment Steps](#3-quick-deployment-steps)
4. [Detailed Guide](#4-detailed-guide)

---

## 1. OVERVIEW & ARCHITECTURE

### Azure Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Microsoft Azure Platform                       │
│                    (beamlabultimate.tech via get.tech)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  Static Web App   │  │   App Service    │  │  App Service    │  │
│  │   (Frontend)      │  │   (Node.js API)  │  │  (Python AI)    │  │
│  │                   │  │                  │  │                 │  │
│  │  React + Vite     │  │  Express.js      │  │  FastAPI        │  │
│  │  TypeScript       │  │  MongoDB         │  │  Google AI      │  │
│  │  Tailwind CSS     │  │  Clerk Auth      │  │  NumPy/SciPy    │  │
│  │                   │  │                  │  │                 │  │
│  │  FREE             │  │  F1: FREE        │  │  F1: FREE       │  │
│  │  (100GB/month)    │  │  (1GB RAM)       │  │  (1GB RAM)      │  │
│  └─────────┬─────────┘  └────────┬─────────┘  └────────┬────────┘  │
│            │                     │                     │            │
└────────────┼─────────────────────┼─────────────────────┼────────────┘
             │                     │                     │
      ┌──────┴──────┬──────────────┴──────┬──────────────┘
      │             │                     │
┌─────▼─────┐ ┌────▼──────┐        ┌─────▼─────┐
│  MongoDB  │ │   Clerk   │        │ Google AI │
│   Atlas   │ │   Auth    │        │  Studio   │
│  (Free)   │ │  (Free)   │        │  (Free)   │
└───────────┘ └───────────┘        └───────────┘
```

**URLs After Deployment:**
- Frontend: `https://beamlabultimate.tech`
- Node.js API: `https://api-beamlab.azurewebsites.net`
- Python AI: `https://ai-beamlab.azurewebsites.net`

---

## 2. PREREQUISITES

### Accounts Needed (All FREE)

| Service | Sign Up URL | Student Benefit |
|---------|-------------|-----------------|
| ✅ GitHub | Already have | ✅ Free repos |
| ⬜ Microsoft Azure | [azure.microsoft.com/students](https://azure.microsoft.com/en-us/free/students/) | ✅ $100 credit |
| ✅ MongoDB Atlas | [cloud.mongodb.com](https://cloud.mongodb.com) | ✅ Free M0 |
| ✅ Google AI | [aistudio.google.com](https://aistudio.google.com) | ✅ Free tier |
| ✅ Clerk | [clerk.com](https://clerk.com) | ✅ 10K MAUs free |
| ✅ get.tech | Already have domain | - |

### Tools You Need Installed

```bash
# Check these are installed:
node --version      # Should be v18+ (you have it)
npm --version       # Should be 9+
python3 --version   # Should be 3.9+ (you have 3.9.6)
git --version       # Should be 2.0+ (you have it)
```

---

## 3. QUICK DEPLOYMENT STEPS

```bash
# 1. Push to GitHub
git add -A
git commit -m "Ready for Azure deployment"
git push origin main

# 2. Go to Azure Portal
# → Create Static Web App (Frontend)
# → Create 2 App Services (Node.js + Python backends)

# 3. Configure environment variables in Azure

# 4. Add custom domain (beamlabultimate.tech)

# 5. Test: https://beamlabultimate.tech
```

---

## 4. DETAILED GUIDE

**👉 For complete step-by-step instructions, see:**

### [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md)

This comprehensive guide covers:
- ✅ Activating GitHub Student Pack ($100 Azure credit)
- ✅ Deploying Frontend (Azure Static Web Apps)
- ✅ Deploying Node.js Backend (Azure App Service F1 - Free)
- ✅ Deploying Python Backend (Azure App Service F1 - Free)
- ✅ Setting up environment variables
- ✅ Configuring custom domain
- ✅ SSL certificate setup
- ✅ CORS configuration
- ✅ Monitoring and troubleshooting

---

## 💰 COST SUMMARY

| Component | Service | Monthly Cost |
|-----------|---------|--------------|
| Frontend | Azure Static Web Apps | **$0** |
| Node.js API | App Service F1 | **$0** |
| Python AI | App Service F1 | **$0** |
| Database | MongoDB Atlas M0 | **$0** |
| Auth | Clerk (10K MAUs) | **$0** |
| AI | Google Gemini Free | **$0** |
| **TOTAL** | | **$0/month** |

**Plus**: $100 Azure credit for future scaling!

---

## ✅ DEPLOYMENT CHECKLIST

- [ ] GitHub Student Pack activated
- [ ] Azure account with $100 credit
- [ ] MongoDB Atlas M0 cluster created
- [ ] Google AI API key obtained
- [ ] Clerk account and keys configured
- [ ] Code pushed to GitHub
- [ ] Azure Static Web App created (Frontend)
- [ ] Azure App Service created (Node.js)
- [ ] Azure App Service created (Python)
- [ ] All environment variables configured
- [ ] Custom domain added
- [ ] DNS configured at get.tech
- [ ] SSL certificate active
- [ ] CORS configured in backends
- [ ] Test all endpoints
- [ ] App live at beamlabultimate.tech

---

## 🔗 USEFUL LINKS

- [Azure for Students](https://azure.microsoft.com/en-us/free/students/)
- [AZURE_DEPLOYMENT.md - Complete Guide](./AZURE_DEPLOYMENT.md)
- [MongoDB Atlas](https://cloud.mongodb.com)
- [Google AI Studio](https://aistudio.google.com)
- [Clerk Dashboard](https://dashboard.clerk.com)
- [GitHub Student Pack](https://education.github.com/pack)

---

**Your BeamLab app will be live at:** `https://beamlabultimate.tech` 🎉

