# Housecall Pro → Patch Retention Sync

**Real-time, automated sync from Housecall Pro to Patch Retention (CityGro)**

- ✅ **FREE** - Runs on Vercel's free tier
- ⚡ **Real-time** - Syncs in <1 second via webhooks
- 🔄 **Automated** - Zero maintenance after setup
- 🎯 **Intelligent** - Smart deduplication and merge logic

---

## 📋 What This Does

This integration automatically syncs customer data from Housecall Pro into Patch Retention (CityGro platform):

- **New customers** → Instantly created in Patch
- **Updated customers** → Automatically updated in Patch
- **Completed jobs** → Updates last service date

### Data Synced

- Name (first/last)
- Phone number
- Email address
- Service address (city, street, state, zip)
- Tags (including source tracking)
- Last service date (from completed jobs)

---

## 🚀 Quick Start

### Prerequisites

- Housecall Pro account with API access
- Patch Retention (CityGro) account with API access
- GitHub account
- Vercel account (free tier is fine)

### Step 1: Get API Keys

#### Housecall Pro API Key

1. Log into Housecall Pro
2. Go to **Settings → Integrations → API & Webhooks**
3. Create an API token
4. Copy the token (starts with letters/numbers)

Your key: `7451ea78a56e4a208e26eec7239f3266`

#### Patch Retention API Key

1. Log into Patch Retention
2. Go to **API Access** section
3. Create new API token
4. Copy the token (starts with `secret_`)

Your key: `secret_A685275_yiXwi5BR2Qe5VX5qsvSJXsyrIJ9a68gvaMZALYGC4bgfBEWXAVBANX9Ecv69`

Your Account ID: `685275`

### Step 2: Deploy to Vercel

1. **Fork/Push this repository to GitHub**
   - Create a new repository on GitHub named `housecall-patch-sync`
   - Push this code to GitHub:
     ```bash
     cd "/Users/owensmith/AI Sandbox/housecall-patch-sync"
     git init
     git add .
     git commit -m "Initial commit - Housecall Pro to Patch sync"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/housecall-patch-sync.git
     git push -u origin main
     ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your `housecall-patch-sync` repository
   - Click "Deploy" (don't configure anything yet)

3. **Add Environment Variables**
   - After deployment, go to **Settings → Environment Variables**
   - Add these 3 variables:

   | Name | Value |
   |------|-------|
   | `HOUSECALL_API_KEY` | `7451ea78a56e4a208e26eec7239f3266` |
   | `PATCH_API_KEY` | `secret_A685275_yiXwi5BR2Qe5VX5qsvSJXsyrIJ9a68gvaMZALYGC4bgfBEWXAVBANX9Ecv69` |
   | `PATCH_ACCOUNT_ID` | `685275` |

   - Click "Save"

4. **Redeploy**
   - Go to **Deployments** tab
   - Click "..." on latest deployment → "Redeploy"
   - This loads the environment variables

### Step 3: Configure Housecall Pro Webhook

1. Go to Housecall Pro → **Settings → Integrations → API & Webhooks**

2. Click **"Add Webhook"**

3. Enter your Vercel URL:
   ```
   https://housecall-patch-sync.vercel.app/api/sync
   ```
   *(Replace `housecall-patch-sync` with your actual Vercel project name)*

4. Enable these events:
   - ✅ `customer.created`
   - ✅ `customer.updated`
   - ✅ `job.completed`

5. Click **"Save"**

### Step 4: Test the Webhook

1. Test the health endpoint:
   ```
   https://housecall-patch-sync.vercel.app/api/health
   ```
   You should see: `{"status":"ok"...}`

2. Create a test customer in Housecall Pro

3. Wait 2-3 seconds

4. Check Patch Retention → You should see the new customer!

5. Check Vercel logs:
   - Go to **Deployments → latest → "View Function Logs"**
   - You should see "Customer synced to Patch Retention"

### Step 5: Bulk Sync (Initial Migration)

Sync all 1,510 existing customers from your local computer:

1. **Create `.env` file** (in this directory):
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env`** and add your real API keys:
   ```env
   HOUSECALL_API_KEY=7451ea78a56e4a208e26eec7239f3266
   PATCH_API_KEY=secret_A685275_yiXwi5BR2Qe5VX5qsvSJXsyrIJ9a68gvaMZALYGC4bgfBEWXAVBANX9Ecv69
   PATCH_ACCOUNT_ID=685275
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run bulk sync**:
   ```bash
   npm run bulk-sync
   ```

5. **Wait 10-15 minutes** for all 1,510 customers to sync

6. **Check results** - You should see summary:
   ```
   Created:  XXX new contacts
   Updated:  YYY existing contacts
   Skipped:  ZZZ contacts (no changes)
   ```

---

## 🎯 How It Works

### Real-Time Sync (Webhooks)

```
Housecall Pro → Webhook Trigger → Vercel Function → Patch Retention
             (customer event)     (api/sync.js)    (creates/updates)
```

**Triggers:**
- Customer created in Housecall Pro → Creates in Patch
- Customer updated in Housecall Pro → Updates in Patch
- Job completed in Housecall Pro → Updates last service date in Patch

**Speed:** <1 second

### Deduplication

Phone number matching:
- Normalizes phone numbers (removes spaces, dashes, +1 prefix)
- Searches existing Patch contacts
- Creates new if not found
- Updates existing if found (with intelligent merge)

### Intelligent Merge

Before updating an existing contact, checks:

1. **Was it manually edited in Patch?** → DON'T update (preserve manual edits)
2. **Is Housecall Pro data newer?** → UPDATE
3. **Is Housecall Pro data more complete?** → UPDATE
4. Otherwise → SKIP (no update needed)

This ensures:
- Manual edits in Patch are never overwritten
- Only meaningful updates are synced
- No unnecessary API calls

---

## 📊 Monitoring

### Vercel Dashboard

View real-time logs:
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **Deployments → latest → "View Function Logs"**

### Check Sync Status

- **Health endpoint:** `https://housecall-patch-sync.vercel.app/api/health`
- **Vercel logs:** Real-time webhook execution logs
- **Patch Retention:** Check for new contacts with tag `Source:housecallpro`

---

## 🔧 Troubleshooting

### Webhook not firing

1. Check Housecall Pro webhook configuration
2. Verify URL is correct (including `/api/sync`)
3. Check Vercel logs for incoming requests
4. Ensure events are enabled (`customer.created`, etc.)

### Customers not syncing

1. Check Vercel environment variables are set
2. Look for errors in Vercel function logs
3. Verify API keys are valid
4. Check customer has phone number (required field)

### Duplicates created

- Phone numbers must match exactly (after normalization)
- Check Patch contacts for existing phone numbers
- Run bulk sync again (will skip duplicates)

### Bulk sync failed

1. Check `.env` file has correct API keys
2. Ensure you ran `npm install` first
3. Check internet connection
4. Look at error messages in terminal

---

## 📁 Project Structure

```
housecall-patch-sync/
├── api/
│   ├── sync.js              # Webhook handler (Vercel endpoint)
│   └── health.js            # Health check endpoint
├── lib/
│   ├── housecallApi.js      # Housecall Pro API client
│   ├── patchApi.js          # Patch Retention API client
│   ├── dedup.js             # Deduplication logic
│   ├── merge.js             # Intelligent merge logic
│   ├── transform.js         # Data transformation
│   └── sync.js              # Main sync orchestration
├── scripts/
│   └── bulkSync.js          # Bulk sync script (one-time migration)
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore file
├── package.json            # Dependencies
├── vercel.json             # Vercel configuration
└── README.md               # This file
```

---

## 🔐 Security

- ✅ API keys stored as environment variables (never in code)
- ✅ `.env` file excluded from git (in `.gitignore`)
- ✅ Webhook endpoint validates request format
- ✅ HTTPS encryption (automatic on Vercel)

---

## 💰 Cost

**$0/month** on Vercel free tier

Includes:
- 100GB bandwidth/month
- 100 hours serverless function execution/month
- Unlimited deployments
- Automatic HTTPS/SSL

Your usage (estimated):
- ~10 new customers/day = 300/month
- ~10 updates/day = 300/month
- Total: ~600 webhook triggers/month
- Execution time: ~1 second each = 10 minutes/month

**Well within free tier limits!**

---

## 🔄 Maintenance

**Monthly tasks (5 minutes):**
- Check Vercel dashboard for any errors
- Spot-check a few customers in Patch to verify sync accuracy

**That's it!** No server updates, no code changes needed.

---

## 🆘 Support

**Issues?**
1. Check Vercel function logs first
2. Verify environment variables are set
3. Test health endpoint
4. Review this README

**Need help?** Check your API documentation:
- [Housecall Pro API Docs](https://docs.housecallpro.com/)
- [Patch Retention (via support)](https://patchretention.com)

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Vercel project deployed successfully
- [ ] Environment variables added to Vercel
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Housecall Pro webhook configured
- [ ] Test customer syncs within 2 seconds
- [ ] Bulk sync completed (1,510 customers migrated)
- [ ] Contacts in Patch have tag `Source:housecallpro`

🎉 **You're done!** Real-time sync is now running 24/7 for free.

---

**Built for Organically Clean Utah**
*Powered by Vercel Serverless Functions*
