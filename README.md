# Blue Collar Academy - Sales Management Portal

A comprehensive sales management system for Blue Collar Academy's roofing education and training programs.

> **🚀 DEPLOYMENT STATUS:** Production Ready
> **📦 Build Status:** ✅ Passing (10.30s)
> **🔐 Security:** RLS Enabled, Auth Protected
> **📱 PWA:** Supported with manifest.json

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment (copy .env.example to .env)
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build
```

## Important Pre-Deployment Notes

⚠️ **REQUIRED BEFORE DEPLOYMENT:**
1. Replace placeholder image files in `/public/` directory - See [ASSETS_NOTE.md](ASSETS_NOTE.md)
2. Configure environment variables for your deployment platform
3. Review and complete [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## Features

- **Lead Management**: Track and manage roofing contractor leads with detailed information
- **Sales Pipeline**: Manage prospects through the sales funnel
- **Commission Tracking**: Monitor sales rep performance and commissions
- **Team Management**: Oversee sales team operations

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# AffiliateWP Webhook Configuration (Optional)
AFFILIATEWP_WEBHOOK_SECRET=your_webhook_secret_key
```

### 2. AffiliateWP Webhook Setup

To integrate with AffiliateWP:

1. **Configure Webhook URL in AffiliateWP:**
   ```
   https://your-supabase-url.supabase.co/functions/v1/affiliatewp-webhook
   ```

2. **Set Webhook Events:**
   - Referral created
   - Referral approved
   - Referral paid
   - Referral cancelled

3. **Configure Webhook Secret (Recommended):**
   - Set a secure webhook secret in AffiliateWP
   - Add the same secret to your environment variables as `AFFILIATEWP_WEBHOOK_SECRET`

4. **Test Webhook Integration:**
   - Create a test referral in AffiliateWP
   - Check the webhook logs in the application
   - Verify commission entries are created automatically

The system supports two types of user accounts:

1. **Management**: Full administrative access with team oversight
2. **Sales Rep**: Sales-focused interface for lead and prospect management

#### Management Account
- Team member management
- Commission tracking and reporting
- System administration
- Lead and prospect management
- Sales pipeline tracking
- Performance analytics

#### Sales Rep Account
- Lead assignment and management
- Sales pipeline tracking
- Commission reporting
- Performance metrics

### 4. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

This application is configured for easy deployment to modern hosting platforms with automatic HTTPS/SSL certificate provisioning.

### Deploy to Netlify (Recommended)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)

1. **Connect Your Repository:**
   - Sign in to Netlify
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository

2. **Configure Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - These are already configured in `netlify.toml`

3. **Set Environment Variables:**
   - Go to Site settings → Environment variables
   - Add your Supabase credentials:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **Deploy:**
   - Click "Deploy site"
   - Netlify will automatically provision SSL certificates
   - Your site will be available at `https://your-site-name.netlify.app`

### Deploy to Vercel (Alternative)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. **Import Project:**
   - Sign in to Vercel
   - Click "Add New" → "Project"
   - Import your Git repository

2. **Configure Project:**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - These are already configured in `vercel.json`

3. **Add Environment Variables:**
   - In the project settings, add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically provision SSL certificates
   - Your site will be available at `https://your-project.vercel.app`

### SSL/HTTPS Configuration

Both Netlify and Vercel automatically provide:
- Free SSL/TLS certificates via Let's Encrypt
- Automatic certificate renewal
- HTTPS enforcement
- Global CDN distribution
- DDoS protection

No additional SSL configuration is required. Your site will be secure by default.

## Key Features

### AffiliateWP Integration
- Secure webhook endpoint for real-time commission tracking
- Automatic affiliate and commission entry management
- Support for upfront and residual commission types
- Webhook signature verification and retry mechanisms
- Comprehensive logging and error handling

### Lead Management
- Comprehensive prospect tracking and scoring
- Multiple lead sources (website, referrals, cold calls)
- Manual follow-up workflows
- Lead qualification and conversion tracking

### Sales Pipeline
- Track prospects from initial contact to enrollment
- Program cost tracking
- Timeline management
- Customer communication history

### Team Collaboration
- Commission and compensation management
- Task assignment and follow-up
- Performance tracking

### Analytics & Reporting
- Sales performance metrics
- Commission calculations
- Team productivity analysis
- Affiliate performance tracking
- Webhook integration monitoring

## Color Scheme

The application uses Blue Collar Academy's brand colors:
- **Primary Blue**: #2563eb (Navy blue from logo)
- **Secondary Red**: #dc2626 (Red from logo)
- **Accent Blue**: #1e40af

## Account Management

### Management Features
- Complete sales oversight
- Team member invitation and management
- Financial reporting and commission tracking
- System configuration and settings

### Sales Rep Features
- Lead assignment and management
- Sales pipeline tracking
- Commission reporting
- Performance analytics

### Security & Access Control
- Role-based permissions
- Company data isolation
- Secure authentication
- Audit logging

## Support

For technical support or questions about the Blue Collar Academy Sales Portal, please contact the development team.