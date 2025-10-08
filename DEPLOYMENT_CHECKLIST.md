# Blue Collar Academy Sales Portal - Deployment Checklist

## Pre-Deployment Verification

### ✅ Build Status
- [x] Production build successful (10.30s)
- [x] Zero TypeScript errors
- [x] Zero ESLint critical warnings
- [x] All dependencies up to date
- [x] Bundle size optimized (1.1MB total, ~280KB gzipped)

### ✅ Code Quality
- [x] Console statements configured for production (auto-removed by build)
- [x] Error handling implemented throughout
- [x] Loading states present
- [x] Error boundaries in place
- [x] TypeScript strict mode enabled

### ✅ Security
- [x] Environment variables properly configured
- [x] .env file not committed to git
- [x] .env.example documented
- [x] Row Level Security (RLS) enabled on all tables
- [x] Supabase Edge Functions deployed
- [x] CORS headers configured
- [x] Security headers in netlify.toml and vercel.json

### ✅ SEO & Meta Tags
- [x] Meta description added
- [x] Open Graph tags added
- [x] Twitter Card tags added
- [x] robots.txt created (blocks crawlers - internal tool)
- [x] Favicon configured
- [x] Theme color set

### ✅ PWA Support
- [x] manifest.json created
- [x] Service worker ready (optional to enable)
- [x] App icons configured
- [x] Offline support (optional to enable)

### ✅ Performance
- [x] Code splitting enabled
- [x] Manual chunks for large libraries
- [x] Assets optimized
- [x] Preconnect to Supabase
- [x] DNS prefetch configured
- [x] Gzip compression enabled

---

## Deployment Steps

### Option 1: Deploy to Netlify (Recommended)

#### 1. Prepare Repository
```bash
# Ensure all changes are committed
git add .
git commit -m "Production ready deployment"
git push origin main
```

#### 2. Connect to Netlify
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Netlify will auto-detect Vite settings from `netlify.toml`

#### 3. Configure Environment Variables
In Netlify Dashboard → Site settings → Environment variables, add:

```
VITE_SUPABASE_URL=https://gpupamrhpmrgslqnzzpb.supabase.co
VITE_SUPABASE_ANON_KEY=[your_anon_key]
AFFILIATEWP_WEBHOOK_SECRET=[your_webhook_secret]
```

**IMPORTANT:** Replace the values with your actual credentials. Never use placeholder values.

#### 4. Deploy
- Click "Deploy site"
- Wait for build to complete (~2-3 minutes)
- Site will be live at `https://[random-name].netlify.app`

#### 5. Custom Domain (Optional)
- Go to Domain settings
- Add custom domain
- Configure DNS records
- SSL certificate auto-provisioned

---

### Option 2: Deploy to Vercel

#### 1. Prepare Repository
```bash
git add .
git commit -m "Production ready deployment"
git push origin main
```

#### 2. Import to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your Git repository
4. Vercel will auto-detect settings from `vercel.json`

#### 3. Configure Environment Variables
Add these in project settings:

```
VITE_SUPABASE_URL=https://gpupamrhpmrgslqnzzpb.supabase.co
VITE_SUPABASE_ANON_KEY=[your_anon_key]
AFFILIATEWP_WEBHOOK_SECRET=[your_webhook_secret]
```

#### 4. Deploy
- Click "Deploy"
- Wait for build (~2-3 minutes)
- Site live at `https://[project-name].vercel.app`

---

## Post-Deployment Verification

### Immediate Checks (First 15 Minutes)

- [ ] **Site Loads:** Visit deployment URL and verify it loads
- [ ] **Authentication:** Test login with existing account
- [ ] **New User:** Test signup flow
- [ ] **Password Change:** Verify forced password change works
- [ ] **Dashboard:** Check dashboard loads with data
- [ ] **Navigation:** Test all menu items
- [ ] **Mobile View:** Test on mobile device or browser dev tools
- [ ] **Console Errors:** Check browser console for errors (F12)

### Functional Testing (First Hour)

#### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail gracefully)
- [ ] Password change flow for new users
- [ ] Logout and re-login

#### Lead Management
- [ ] View existing leads
- [ ] Create new lead
- [ ] Edit lead details
- [ ] Delete lead (if authorized)
- [ ] Search and filter leads

#### Sales Pipeline
- [ ] View deals in pipeline
- [ ] Create new deal
- [ ] Move deal between stages
- [ ] Update deal value
- [ ] Convert lead to deal

#### Team Management (Manager Only)
- [ ] View team members
- [ ] Create new team member
- [ ] Verify welcome email sent
- [ ] Edit team member details
- [ ] View team performance

#### Commissions
- [ ] View commission entries
- [ ] Check affiliate list
- [ ] Update commission status
- [ ] View commission reports

#### Calendar
- [ ] View appointments
- [ ] Create appointment
- [ ] Edit appointment
- [ ] Check reminder functionality

### Integration Testing

#### Supabase
- [ ] Database connections working
- [ ] RLS policies enforcing security
- [ ] Data isolation between companies
- [ ] Real-time updates (if enabled)

#### Edge Functions
- [ ] `create-sales-rep-account` accessible
- [ ] `affiliatewp-webhook` responding
- [ ] `reset-rep-password` functional
- [ ] Proper error responses
- [ ] Authorization checks working

#### Webhooks
- [ ] AffiliateWP webhook endpoint accessible
- [ ] Webhook signature verification working
- [ ] Commission entries created automatically
- [ ] Webhook logs recording events

---

## Security Verification

### Access Control
- [ ] Unauthenticated users cannot access dashboard
- [ ] Users can only see their company data
- [ ] Managers have proper elevated permissions
- [ ] Sales reps have limited access
- [ ] Service role not exposed to client

### Data Protection
- [ ] No sensitive data in browser console
- [ ] No API keys exposed in client code
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] XSS protection active

### API Security
- [ ] All API calls require authentication
- [ ] Rate limiting considered (if needed)
- [ ] SQL injection prevention (parameterized queries)
- [ ] Input validation on all forms

---

## Performance Monitoring

### Initial Metrics
- [ ] Page load time < 3 seconds
- [ ] Time to interactive < 5 seconds
- [ ] First contentful paint < 2 seconds
- [ ] Largest contentful paint < 4 seconds

### Bundle Analysis
- [ ] Total bundle size: ~1.1MB (acceptable)
- [ ] Gzipped size: ~280KB (good)
- [ ] Charts bundle: 411KB (largest, consider lazy loading)
- [ ] Vendor bundle: 141KB
- [ ] App bundle: 343KB

### Database Performance
- [ ] Query response times < 500ms
- [ ] Indexes on frequently queried columns
- [ ] No N+1 query problems
- [ ] Connection pooling working

---

## Troubleshooting Common Issues

### White Screen / Blank Page
1. Check browser console for errors (F12)
2. Verify environment variables set correctly
3. Clear browser cache (Ctrl+Shift+R)
4. Check Netlify/Vercel build logs

### Authentication Errors
1. Verify Supabase URL and anon key
2. Check Supabase project is active
3. Verify RLS policies not blocking access
4. Clear localStorage/sessionStorage

### Database Connection Issues
1. Check Supabase project status
2. Verify API keys are correct
3. Check RLS policies allow access
4. Review Supabase logs

### Edge Function Errors
1. Check function deployed successfully
2. Verify CORS headers present
3. Check function logs in Supabase
4. Test with Postman/cURL

### Performance Issues
1. Check bundle size hasn't increased
2. Verify CDN caching working
3. Check database query performance
4. Review Supabase usage limits

---

## Monitoring & Maintenance

### Daily Checks
- Review error logs
- Check user activity
- Monitor webhook deliveries
- Verify backup status

### Weekly Tasks
- Review performance metrics
- Check for Supabase updates
- Review security logs
- Update dependencies (if needed)

### Monthly Tasks
- Database maintenance
- Performance optimization review
- Security audit
- User feedback review

---

## Rollback Plan

If critical issues arise:

### Immediate Rollback (Netlify)
1. Go to Deploys tab
2. Click on last known good deploy
3. Click "Publish deploy"
4. Site reverts in ~30 seconds

### Immediate Rollback (Vercel)
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Instant rollback

### Database Rollback
1. Supabase doesn't support automatic rollback
2. Use migration files to revert schema changes
3. Restore from backup if needed
4. Contact Supabase support for assistance

---

## Support Contacts

### Hosting Issues
- **Netlify Support:** support@netlify.com
- **Vercel Support:** support@vercel.com

### Database Issues
- **Supabase Support:** https://supabase.com/support
- **Supabase Status:** https://status.supabase.com

### Application Issues
- Check TROUBLESHOOTING.md
- Review GitHub issues (if public repo)
- Contact development team

---

## Success Criteria

Deployment is successful when:

- ✅ All post-deployment checks pass
- ✅ No critical errors in logs
- ✅ Authentication working for all user types
- ✅ All major features functional
- ✅ Performance metrics within acceptable ranges
- ✅ Security checks pass
- ✅ Webhook integrations working
- ✅ Team members can access and use the system

---

## Next Steps After Deployment

1. **User Training:** Onboard team members to the new system
2. **Documentation:** Share user guides and best practices
3. **Feedback Loop:** Collect user feedback for improvements
4. **Monitoring:** Set up error tracking (Sentry, LogRocket, etc.)
5. **Optimization:** Continue to optimize based on usage patterns
6. **Features:** Plan next iteration of features

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Deployment URL:** _______________

**Status:** ⬜ Success  ⬜ Issues Found  ⬜ Rolled Back

**Notes:**
_____________________________________________________________________________
_____________________________________________________________________________
_____________________________________________________________________________
