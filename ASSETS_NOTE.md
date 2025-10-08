# Asset Files Notice

## Image Placeholders

The following files in the `public/` directory are currently **text placeholders** and need to be replaced with actual image files before deployment:

### Files to Replace:
1. **bca.png** - Blue Collar Academy logo
2. **tbi.webp** - The Builders Institute logo
3. **Red and Black Modern Roofing Specialized Logo Design (2000 x 1500 px).png** - Roofing logo

### Current Status:
These files are ASCII text placeholders (20 bytes each) and will not display as images.

### Required Actions Before Deployment:

#### 1. Blue Collar Academy Logo (bca.png)
- **Purpose:** Favicon, app icon, branding
- **Recommended Size:** 512x512px (PNG format)
- **Usage:**
  - Browser favicon
  - PWA app icon
  - Login page branding
- **Location:** `/public/bca.png`

#### 2. The Builders Institute Logo (tbi.webp)
- **Purpose:** Partner branding
- **Recommended Size:** 200x200px or original aspect ratio
- **Format:** WebP (optimized) or PNG
- **Usage:** Display in application as needed
- **Location:** `/public/tbi.webp`

#### 3. Roofing Specialized Logo
- **Purpose:** Additional branding
- **Recommended Size:** 2000x1500px or optimized version
- **Format:** PNG or WebP
- **Location:** `/public/Red and Black Modern Roofing Specialized Logo Design (2000 x 1500 px).png`
- **Note:** Consider renaming to simpler filename like `roofing-logo.png`

### Steps to Replace:

1. **Obtain actual logo files** from the design team or brand assets
2. **Optimize images** for web:
   ```bash
   # Example using ImageMagick
   convert original.png -resize 512x512 -quality 90 bca.png

   # Example using online tools
   # - TinyPNG (https://tinypng.com)
   # - Squoosh (https://squoosh.app)
   ```
3. **Replace files** in `/public/` directory
4. **Test** that images display correctly locally
5. **Commit and deploy**

### Image Optimization Guidelines:

- **PNG Format:** For logos with transparency
- **WebP Format:** For photographs or complex graphics (smaller file size)
- **Compression:** Use tools like TinyPNG or Squoosh to reduce file size
- **Max File Size:** Keep under 100KB per image when possible
- **Retina Support:** Provide 2x versions for high-DPI displays

### Testing After Replacement:

1. **Favicon:** Check browser tab icon
2. **PWA Icon:** Test "Add to Home Screen" on mobile
3. **Login Page:** Verify branding displays correctly
4. **Loading States:** Ensure fast image load times

### Alternative: Using CDN

If you prefer to host images on a CDN:

1. Upload images to CDN (Cloudinary, ImgIx, etc.)
2. Update image references in code to use CDN URLs
3. Benefits: Better performance, image transformations on-the-fly

---

**Status:** 🔴 **ACTION REQUIRED** - Replace placeholder images before production deployment

**Priority:** **HIGH** - Affects branding and user experience

**Assigned To:** _________________

**Completion Date:** _________________
