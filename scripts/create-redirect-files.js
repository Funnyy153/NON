// Script to create redirect HTML files for pages with trailing slash
// Run this after: npm run build

const fs = require('fs');
const path = require('path');

const pages = ['before', 'after', 'alert','dashboard'];
const outDir = path.join(process.cwd(), 'out', 'pages');

// Ensure pages directory exists
if (!fs.existsSync(outDir)) {
  console.error('out/pages directory not found. Please run "npm run build" first.');
  process.exit(1);
}

pages.forEach(page => {
  const pageDir = path.join(outDir, page);
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }
  
  // Create index.html that redirects to the .html file
  // Then use history API to clean up the URL (remove .html extension)
  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <script>
    // Redirect to .html file first, then clean up URL
    (function() {
      var currentPath = window.location.pathname;
      // Only redirect if we're on the trailing slash URL
      if (currentPath.endsWith('/') && currentPath.includes('/pages/${page}/')) {
        // Load the .html file directly
        window.location.replace('/pages/${page}.html');
      }
    })();
  </script>
  <link rel="canonical" href="/pages/${page}">
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  
  const indexPath = path.join(pageDir, 'index.html');
  fs.writeFileSync(indexPath, indexHtml);
  console.log(`Created: ${indexPath}`);
});

console.log('Redirect files created successfully!');
