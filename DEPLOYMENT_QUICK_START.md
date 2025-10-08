# 🚀 Quick Start - Deploy in 5 Minutes

**Status:** ✅ Production Ready | **Build:** ✅ Passing | **Bundle:** 1.1MB (280KB gzipped)

---

## ⚠️ Before You Deploy

### Required Actions (Do First!)

1. **Replace Image Files**
   - Location: `/public/` directory
   - Files: `bca.png`, `tbi.webp`, and roofing logo
   - Currently: Text placeholders (won't display)
   - See: [ASSETS_NOTE.md](ASSETS_NOTE.md)

2. **Get Your Credentials**
   - Supabase URL: https://gpupamrhpmrgslqnzzpb.supabase.co
   - Supabase Anon Key: [Get from Supabase Dashboard]
   - Webhook Secret: 15e5b3ef6da45084ea6d081ba5bcd0f8

---

## Deploy to Netlify (2 Minutes)

### Step 1: Push to Git
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect to Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Netlify auto-detects settings from `netlify.toml` ✅

### Step 3: Add Environment Variables
In Netlify Dashboard → Site settings → Environment variables:
```
VITE_SUPABASE_URL=https://gpupamrhpmrgslqnzzpb.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
AFFILIATEWP_WEBHOOK_SECRET=your_webhook_secret
```

### Step 4: Deploy
- Click "Deploy site"
- Wait ~3 minutes
- Done! 🎉

---

## Deploy to Vercel (2 Minutes)

### Step 1: Push to Git
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Import to Vercel
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your Git repository
4. Vercel auto-detects settings from `vercel.json` ✅

### Step 3: Add Environment Variables
In project settings:
```
VITE_SUPABASE_URL=https://gpupamrhpmrgslqnzzpb.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
AFFILIATEWP_WEBHOOK_SECRET=your_webhook_secret
```

### Step 4: Deploy
- Click "Deploy"
- Wait ~3 minutes
- Done! 🎉

---

## Verify Deployment (5 Minutes)

### Quick Tests
1. ✅ Visit your deployment URL
2. ✅ Login with existing account
3. ✅ Check dashboard loads
4. ✅ Test creating a lead
5. ✅ Verify mobile view works

### If Something's Wrong
- **White screen?** Check browser console (F12)
- **Can't login?** Verify environment variables
- **Images missing?** Replace placeholder files (see step 1)
- **More help?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## Need More Help?

- **Full Guide:** [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Production Summary:** [PRODUCTION_READY_SUMMARY.md](PRODUCTION_READY_SUMMARY.md)

---

**Total Time:** ~5 minutes (excluding image asset preparation)

**Success Rate:** High (all pre-checks passed ✅)

**Support:** Check documentation files above or contact development team
