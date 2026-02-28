#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Start a simple HTTP server
const server = http.createServer((req, res) => {
  let filePath;
  
  if (req.url === '/') {
    filePath = path.resolve(__dirname, 'slidekit/test/test.html');
  } else if (req.url === '/slidekit.js' || req.url === '/slidekit-debug.js') {
    filePath = path.resolve(__dirname, 'slidekit' + req.url);
  } else if (req.url.startsWith('/src/')) {
    // Imports from slidekit.js (e.g. ./src/state.js) resolve relative to /slidekit.js
    filePath = path.resolve(__dirname, 'slidekit' + req.url);
  } else if (req.url.startsWith('/slidekit')) {
    filePath = path.resolve(__dirname, '.' + req.url);
  } else {
    // Relative imports from test.html go to slidekit/test/
    filePath = path.resolve(__dirname, 'slidekit/test' + req.url);
  }
  
  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.css': 'text/css'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found: ' + filePath);
  }
});

server.listen(9999, async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(msg.text());
      }
    });
    
    await page.goto('http://localhost:9999', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for tests to complete
    await page.waitForFunction(() => {
      const summary = document.getElementById('test-summary');
      return summary !== null;
    }, { timeout: 60000 });
    
    // Extract results
    const results = await page.evaluate(() => {
      const summary = document.getElementById('test-summary');
      const html = document.getElementById('test-results').innerHTML;
      return {
        total: parseInt(summary.dataset.total),
        passed: parseInt(summary.dataset.passed),
        failed: parseInt(summary.dataset.failed),
        html: html
      };
    });
    
    console.log('\n========================================');
    console.log('TEST RESULTS');
    console.log('========================================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log('========================================\n');
    
    if (results.failed > 0) {
      console.log('FAILED TESTS:\n');
      const regex = /<li class="fail">([^<]+)<pre>([^<]+)<\/pre><\/li>/g;
      let match;
      while ((match = regex.exec(results.html)) !== null) {
        console.log(`❌ ${match[1]}`);
        console.log(`   ${match[2]}\n`);
      }
    }
    
    await browser.close();
    server.close();
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Error:', err.message);
    server.close();
    process.exit(1);
  }
});
