# InvoiceIQ Marketing Website

A clean, responsive, single-page marketing website for InvoiceIQ - AI Invoice to Excel AP Bills. Built with vanilla HTML, CSS, and JavaScript for easy deployment on GitHub Pages.

![InvoiceIQ](assets/og-image.svg)

## 🚀 Features

- **Single Page Application** - No build tools required
- **Responsive Design** - Mobile-first approach, works on all devices
- **Accessibility** - WCAG compliant with semantic HTML and keyboard navigation
- **Dark Mode Support** - Automatic theme switching based on user preference
- **Smooth Scrolling** - Anchor navigation with scrollspy
- **Contact Form** - Formspree integration with mailto fallback
- **SEO Optimized** - Open Graph, Twitter Cards, and JSON-LD structured data
- **Performance** - Optimized images, lazy loading, and minimal dependencies

## 📁 File Structure

```
/
├── index.html          # Main HTML file
├── styles.css          # All styles and responsive design
├── script.js           # JavaScript functionality
├── assets/             # Images and assets
│   ├── logo.svg        # Company logo
│   ├── hero.svg        # Hero section image
│   ├── og-image.svg    # Open Graph image (1200×630)
│   ├── favicon.svg     # Favicon
│   └── sample-AP_Bills.xlsx # Sample Excel file
├── README.md           # This file
└── LICENSE             # MIT License
```

## 🎨 Customization

### Text and Content

Edit the content directly in `index.html`:

- **Hero Section**: Update the headline, subtitle, and call-to-action buttons
- **Problem/Solution**: Modify the bullet points and descriptions
- **FAQ**: Add or modify questions and answers
- **Contact**: Update contact information and form fields

### Colors and Theme

Modify the CSS variables in `styles.css`:

```css
:root {
    --bg: #0b1220;           /* Background color */
    --fg: #eaf0ff;           /* Text color */
    --primary: #1f6feb;      /* Primary blue */
    --accent: #6aa9ff;       /* Accent blue */
    /* ... more variables */
}
```

### Links and URLs

Update the following in `index.html`:

- **App Link**: Change the "Try the App" button URL
- **GitHub Repo**: Update repository links
- **Demo Video**: Replace YouTube embed URL
- **Sample Excel**: Update download link

### Contact Form

Configure the contact form in `script.js`:

```javascript
const CONFIG = {
    // Set your Formspree endpoint here
    FORMSPREE_ENDPOINT: 'https://formspree.io/f/YOUR_FORM_ID',
    // ... other settings
};
```

If no Formspree endpoint is set, the form will use mailto fallback.

## 🚀 Deployment on GitHub Pages

### Step 1: Create Repository

1. Create a new repository on GitHub (e.g., `invoiceiq-site`)
2. Clone the repository locally
3. Copy all files to the repository root

### Step 2: Deploy to GitHub Pages

1. **Commit and push files**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Scroll to "Pages" section
   - Source: "Deploy from a branch"
   - Branch: "main" / "root"
   - Click "Save"

3. **Wait for deployment**:
   - GitHub will build and deploy your site
   - Your site will be available at `https://<username>.github.io/<repository-name>`

### Step 3: Custom Domain (Optional)

1. **Add custom domain**:
   - In repository Settings → Pages
   - Add your domain in "Custom domain"
   - Add a `CNAME` file with your domain

2. **Configure DNS**:
   - Add CNAME record pointing to `<username>.github.io`

## 🔧 Configuration

### Formspree Setup

1. **Create Formspree account**:
   - Go to [formspree.io](https://formspree.io)
   - Create account and new form
   - Copy the form endpoint URL

2. **Update script.js**:
   ```javascript
   const CONFIG = {
       FORMSPREE_ENDPOINT: 'https://formspree.io/f/YOUR_FORM_ID',
   };
   ```

### SEO and Social Media

Update meta tags in `index.html`:

```html
<title>Your Custom Title</title>
<meta name="description" content="Your custom description">
<meta property="og:title" content="Your Custom Title">
<meta property="og:description" content="Your custom description">
<meta property="og:image" content="https://yourdomain.com/assets/og-image.svg">
```

### Analytics (Optional)

Add Google Analytics or other tracking:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## 🎯 Sections Overview

### Header/Navigation
- Sticky navigation with smooth scrolling
- Mobile hamburger menu
- Active section highlighting

### Hero Section
- Compelling headline and subtitle
- Call-to-action buttons
- Hero image/illustration
- Trust badges

### Problem Section
- Pain points your product solves
- Visual icons and descriptions

### Solution Section
- Key features and benefits
- Card-based layout

### How It Works
- Step-by-step process
- Timeline or flow diagram

### Demo Section
- Embedded video or screenshots
- Download sample files

### FAQ Section
- Common questions and answers
- Expandable/collapsible design

### Privacy Section
- Data handling information
- Privacy policy links

### Contact Section
- Contact form with validation
- Success/error messaging

### Footer
- Links to repository, license, issues
- Copyright information

## 🛠️ Development

### Local Development

1. **Clone repository**:
   ```bash
   git clone https://github.com/yourusername/invoiceiq-site.git
   cd invoiceiq-site
   ```

2. **Serve locally**:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open browser**: `http://localhost:8000`

### Testing

- **Responsive Design**: Test at 360px, 768px, 1280px
- **Accessibility**: Use screen readers and keyboard navigation
- **Performance**: Check Lighthouse scores
- **Cross-browser**: Test in Chrome, Firefox, Safari, Edge

## 📱 Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔒 Security

- No external dependencies
- No tracking by default
- Form validation and sanitization
- HTTPS required for production

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/invoiceiq-site/issues)
- **Email**: contact@invoiceiq.com
- **Documentation**: [Project Wiki](https://github.com/yourusername/invoiceiq-site/wiki)

## 🎉 Acknowledgments

- Built with vanilla HTML, CSS, and JavaScript
- No external frameworks or dependencies
- Optimized for performance and accessibility
- Ready for GitHub Pages deployment

---

**InvoiceIQ** - Transform invoices into clean AP bills with AI. Free, open source, no vendor lock-in.
