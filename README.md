# VitalTouch Home Care Website

A professional, multi-page website for VitalTouch Home Care - providing compassionate, technology-enhanced in-home care for seniors in Chicago and Cook County.

## 🌐 Live Site

Once deployed, your site will be available at: `https://[your-username].github.io/[repo-name]/`

## 📁 Site Structure

```
vitaltouch-site/
├── index.html          # Home page
├── about.html          # About Us
├── services.html       # All Services (detailed)
├── pricing.html        # Pricing & Payment Options
├── service-areas.html  # Service Areas (80+ locations)
├── faq.html            # Frequently Asked Questions
├── contact.html        # Contact Form & Info
├── blog.html           # Blog placeholder
├── css/
│   └── style.css       # Main stylesheet
├── js/
│   └── main.js         # JavaScript functionality
└── images/
    ├── logo-main.png   # Main logo
    ├── logo-symbol.png # Symbol only
    └── logo-white.png  # White version for dark backgrounds
```

## 🚀 Deploy to GitHub Pages

### Option 1: Upload via GitHub Web Interface

1. Create a new repository on GitHub
2. Click "uploading an existing file"
3. Drag and drop ALL files from this folder
4. Commit the changes
5. Go to Settings → Pages
6. Under "Source", select "Deploy from a branch"
7. Select "main" branch and "/ (root)" folder
8. Click Save
9. Wait 1-2 minutes for deployment

### Option 2: Using Git Command Line

```bash
# Initialize git in this folder
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - VitalTouch website"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to GitHub
git push -u origin main

# Then enable GitHub Pages in repository Settings → Pages
```

## ✨ Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, professional design with animations
- **SEO Optimized** - Meta tags, semantic HTML, 80+ service area pages
- **Fast Loading** - Minimal dependencies, optimized images
- **Accessible** - Semantic HTML, proper contrast ratios

## 🎨 Customization

### Colors (in css/style.css)
```css
--teal: #1B9B8C;        /* Primary brand color */
--navy: #0F2137;        /* Dark text/backgrounds */
--cream: #FDF9F3;       /* Light backgrounds */
--gold: #E8B86D;        /* Accent color */
```

### Fonts
- **Headings:** DM Serif Display (Google Fonts)
- **Body:** Plus Jakarta Sans (Google Fonts)

## 📞 Contact Info to Update

Make sure these are correct in all HTML files:
- Phone: (312) 957-4492
- Email: ifeanyi@vitaltouch.care
- Address: 3325 183rd St, Suite B, Homewood, IL 60430

## 📝 License

© 2025 VitalTouch Home Care. All rights reserved.
