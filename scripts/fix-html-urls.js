// Script to add URL cleanup script to HTML files
// This removes .html extension from URL after page loads

const fs = require('fs');
const path = require('path');

const pages = ['before', 'after', 'alert'];
const outDir = path.join(process.cwd(), 'out', 'pages');

pages.forEach(page => {
  const htmlFile = path.join(outDir, `${page}.html`);
  
  if (!fs.existsSync(htmlFile)) {
    console.warn(`File not found: ${htmlFile}`);
    return;
  }
  
  // Read the HTML file
  let htmlContent = fs.readFileSync(htmlFile, 'utf8');
  
  // Check if script already exists
  if (htmlContent.includes('cleanup-url-script')) {
    console.log(`Script already exists in ${htmlFile}`);
    return;
  }
  
  // Add script before closing </body> tag to clean up URL
  const cleanupScript = `
<script id="cleanup-url-script">
  // Clean up URL - remove .html extension from address bar
  (function() {
    if (window.location.pathname.endsWith('.html')) {
      var cleanPath = window.location.pathname.replace(/\\.html$/, '');
      window.history.replaceState(null, '', cleanPath);
    }
  })();
</script>`;
  
  // Insert before closing </body> tag
  htmlContent = htmlContent.replace('</body>', cleanupScript + '</body>');
  
  // Write back
  fs.writeFileSync(htmlFile, htmlContent);
  console.log(`Updated: ${htmlFile}`);
});

console.log('URL cleanup scripts added successfully!');
