// Script to add URL cleanup script to HTML files
// This removes .html extension from URL after page loads
// Automatically discovers all HTML files generated from page.tsx

const fs = require('fs');
const path = require('path');

// Function to find all page.tsx files recursively
function findPageFiles(dir, basePath = '') {
  const pages = [];
  
  if (!fs.existsSync(dir)) {
    return pages;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.join(basePath, item.name);
    
    if (item.isDirectory()) {
      // Recursively search subdirectories
      const subPages = findPageFiles(fullPath, relativePath);
      pages.push(...subPages);
    } else if (item.name === 'page.tsx') {
      // Convert path to URL path
      let urlPath = relativePath.replace(/\\/g, '/').replace('/page.tsx', '');
      
      // Handle root page
      if (urlPath === 'page' || urlPath === '') {
        urlPath = '/';
      } else {
        if (!urlPath.startsWith('/')) {
          urlPath = '/' + urlPath;
        }
      }
      
      pages.push({
        filePath: fullPath,
        urlPath: urlPath
      });
    }
  }
  
  return pages;
}

// Find all pages
const appDir = path.join(process.cwd(), 'app');
const allPages = findPageFiles(appDir);

console.log('Found pages:');
allPages.forEach(page => {
  console.log(`  ${page.urlPath}`);
});

const outDir = path.join(process.cwd(), 'out');

if (!fs.existsSync(outDir)) {
  console.error('out directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Process each page
let updatedCount = 0;
let skippedCount = 0;

allPages.forEach(page => {
  // Determine HTML file path
  let htmlPath = page.urlPath;
  
  // Root page -> index.html
  if (htmlPath === '/') {
    htmlPath = path.join(outDir, 'index.html');
  } else {
    // Remove leading slash and add .html
    if (htmlPath.startsWith('/')) {
      htmlPath = htmlPath.substring(1);
    }
    htmlPath = path.join(outDir, htmlPath + '.html');
  }
  
  if (!fs.existsSync(htmlPath)) {
    console.warn(`File not found: ${htmlPath}`);
    skippedCount++;
    return;
  }
  
  // Read the HTML file
  let htmlContent = fs.readFileSync(htmlPath, 'utf8');
  
  // Check if script already exists
  if (htmlContent.includes('cleanup-url-script')) {
    console.log(`Script already exists in ${htmlPath}`);
    skippedCount++;
    return;
  }
  
  // Add script before closing </body> tag to clean up URL
  const cleanupScript = `
<script id="cleanup-url-script">
  // Clean up URL - remove .html extension from address bar
  (function() {
    if (window.location.pathname.endsWith('.html')) {
      var cleanPath = window.location.pathname.replace(/\\.html$/, '');
      // Ensure root path is / not empty
      if (cleanPath === '') {
        cleanPath = '/';
      }
      window.history.replaceState(null, '', cleanPath);
    }
  })();
</script>`;
  
  // Insert before closing </body> tag
  htmlContent = htmlContent.replace('</body>', cleanupScript + '</body>');
  
  // Write back
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`Updated: ${htmlPath}`);
  updatedCount++;
});

console.log(`\nURL cleanup scripts added successfully!`);
console.log(`Updated: ${updatedCount} files`);
console.log(`Skipped: ${skippedCount} files`);
