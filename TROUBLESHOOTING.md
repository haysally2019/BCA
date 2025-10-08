# Troubleshooting Guide

## White Screen Issues

If you're seeing a white screen when the application loads, follow these steps:

### Quick Fixes (Try First)

1. **Hard Refresh:** Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. **Clear Storage:** Open DevTools (F12) → Application → Clear Storage → Clear site data
3. **Check Console:** Press F12, go to Console tab, look for red errors
4. **Restart Dev Server:** Stop the server (Ctrl+C) and run `npm run dev` again

### 1. Project Won't Load / White Screen

If you encounter a white screen or unexpected errors:

1. **Check browser console** (F12 → Console tab) for errors
2. **Clear browser cache and data**
3. **Verify environment variables** in `.env` file
4. **Restart the development server**

### 2. Build Issues

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Update browserslist database
npx update-browserslist-db@latest

# Run build
npm run build
```

### 3. Authentication Issues

If users can't login or the app shows loading indefinitely:

1. **Check Supabase connection** - Open browser console and run:
   ```javascript
   supabase.auth.getSession().then(console.log)
   ```
2. **Verify environment variables** in `.env`:
   - `VITE_SUPABASE_URL` should be your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` should be your anon/public key
3. **Clear auth state** - Open browser console and run:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
   Then refresh the page

### 3a. Password Change Flow Issues

If you see a white screen after logging in with a new account:

1. The app checks if the user needs to change their password
2. Open browser console and check for errors related to `must_change_password`
3. Clear storage and try again:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
4. Check user metadata:
   ```javascript
   supabase.auth.getUser().then(data => {
     console.log('User metadata:', data.data.user?.user_metadata);
   });
   ```

### 4. Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 5. Error Recovery

The application includes error boundaries that should catch most runtime errors and provide a "Refresh Page" button. If you see this:

1. Click "Refresh Page"
2. If the issue persists, check the browser console for specific errors
3. Clear browser cache and reload

### 6. Performance Issues

If the app loads slowly:

1. The bundle is now split into smaller chunks for better loading
2. Heavy components are wrapped in error boundaries
3. Check network conditions if loading is still slow

### 7. ESLint Issues During Development

ESLint has been configured with proper TypeScript support. If you see too many warnings:

- Use the development ESLint config for less strict linting
- Focus on fixing errors rather than warnings during development

## Key Improvements Made

✅ Added error boundaries around critical components
✅ Improved authentication error handling with fallbacks
✅ Implemented code splitting to reduce bundle size
✅ Fixed React Hook dependency issues
✅ Added proper TypeScript types
✅ Updated Vite configuration for better performance
✅ Created error utility functions for better debugging