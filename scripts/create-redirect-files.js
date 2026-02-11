// Script to create redirect HTML files for pages with trailing slash
// Run this after: npm run build
// Automatically discovers all page.tsx files in app directory

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
      // Found a page.tsx file
      // Convert path to URL path
      // app/Nonelectiondatacenter/dashboard/page.tsx -> /Nonelectiondatacenter/dashboard
      // app/pages/electionunit/page.tsx -> /pages/electionunit
      // app/page.tsx -> /
      
      let urlPath = relativePath.replace(/\\/g, '/').replace('/page.tsx', '');
      
      // Handle root page
      if (urlPath === 'page' || urlPath === '') {
        urlPath = '/';
      } else {
        // Ensure it starts with /
        if (!urlPath.startsWith('/')) {
          urlPath = '/' + urlPath;
        }
      }
      
      pages.push({
        filePath: fullPath,
        urlPath: urlPath,
        dirPath: path.dirname(relativePath)
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
  console.log(`  ${page.urlPath} (from ${page.filePath})`);
});

const outDir = path.join(process.cwd(), 'out');

// Ensure out directory exists
if (!fs.existsSync(outDir)) {
  console.error('out directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Process each page
allPages.forEach(page => {
  // Skip root page (/) as it doesn't need redirect
  if (page.urlPath === '/') {
    return;
  }
  
  // Determine output path
  // /Nonelectiondatacenter/dashboard -> out/Nonelectiondatacenter/dashboard
  // /pages/electionunit -> out/pages/electionunit
  let outputPath = page.urlPath;
  if (outputPath.startsWith('/')) {
    outputPath = outputPath.substring(1);
  }
  
  const pageDir = path.join(outDir, outputPath);
  const htmlFile = path.join(outDir, outputPath + '.html');
  
  // Check if HTML file exists
  if (!fs.existsSync(htmlFile)) {
    console.warn(`HTML file not found: ${htmlFile}, skipping...`);
    return;
  }
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(pageDir)) {
    fs.mkdirSync(pageDir, { recursive: true });
  }
  
  // Create index.html that redirects to the .html file
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
      var targetPath = '${page.urlPath}.html';
      // Only redirect if we're on the trailing slash URL
      if (currentPath.endsWith('/') && currentPath === '${page.urlPath}/') {
        // Load the .html file directly
        window.location.replace(targetPath);
      }
    })();
  </script>
  <link rel="canonical" href="${page.urlPath}">
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  
  const indexPath = path.join(pageDir, 'index.html');
  fs.writeFileSync(indexPath, indexHtml);
  console.log(`Created: ${indexPath}`);
});

console.log(`\nRedirect files created successfully for ${allPages.length} pages!`);
