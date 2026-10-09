const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const root = __dirname;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  if (pathname === '/' || pathname === '/index.html' || pathname === '/resume.html') {
    const source = fs.readFileSync(path.join(root, 'resume.jsx'), 'utf8');
    const match = source.match(/const resumeMarkup = ("(?:\\.|[^"])*");/);

    if (!match) {
      response.writeHead(500);
      response.end('Could not find embedded resume markup');
      return;
    }

    let markup = JSON.parse(match[1]);
    markup = markup.replace(/data-visible="false"/g, 'data-visible="true"')
                   .replace(/data-loaded="false"/g, 'data-loaded="true"');

    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="theme-color" content="#111">
  <title>Harish Domma | Resume</title>
  <link rel="stylesheet" href="/resume.css">
</head>
<body data-theme="dark">
  <div class="resume-page" data-theme="dark">${markup}</div>
  <script>
    (() => {
      const page = document.querySelector('.resume-page');
      const header = page.querySelector('header');
      let theme = localStorage.getItem('portfolio-theme-v1') || 'dark';

      function applyTheme() {
        document.documentElement.dataset.theme = theme;
        document.body.dataset.theme = theme;
        if (page) page.dataset.theme = theme;
        page.querySelectorAll('[data-theme]').forEach(element => {
          element.dataset.theme = theme;
        });
        document.querySelector('meta[name="theme-color"]').content =
          theme === 'dark' ? '#111' : '#F2F2F2';
        document.querySelector('meta[name="color-scheme"]').content =
          theme === 'dark' ? 'dark light' : 'light dark';
        localStorage.setItem('portfolio-theme-v1', theme);
      }

      function revealAll() {
        document.querySelectorAll('[data-visible]').forEach(el => el.setAttribute('data-visible', 'true'));
        document.querySelectorAll('[data-loaded]').forEach(el => el.setAttribute('data-loaded', 'true'));
      }

      applyTheme();
      revealAll();
      window.addEventListener('DOMContentLoaded', revealAll);

      let animationFrameId;
      function updateParallax() {
        const scrollY = window.scrollY || window.pageYOffset || 0;
        const bgElement = page ? (page.querySelector('._backgroundImageElement_tvrlc_157') || page.querySelector('[class*="_backgroundImageElement"]')) : null;
        if (bgElement) {
          bgElement.style.transform = 'translate3d(0, ' + (scrollY * 0.75) + 'px, 0)';
        }
      }
      function onScroll() {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(updateParallax);
      }
      updateParallax();
      window.addEventListener('scroll', onScroll, { passive: true });

      document.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;

        if (button.getAttribute('aria-label') === 'Toggle theme') {
          theme = theme === 'dark' ? 'light' : 'dark';
          applyTheme();
        } else if (button.getAttribute('aria-label') === 'Menu') {
          const open = button.getAttribute('aria-expanded') !== 'true';
          button.setAttribute('aria-expanded', String(open));
          header.setAttribute('data-menu-open', String(open));
        }
      });
    })();
  </script>
</body>
</html>`);
    return;
  }

  let filePath;
  try {
    filePath = path.resolve(root, `.${decodeURIComponent(pathname)}`);
  } catch {
    response.writeHead(400);
    response.end('Bad path');
    return;
  }

  if (!filePath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'File read failed');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    });
    response.end(data);
  });
}).listen(5173, '127.0.0.1', () => {
  console.log('Resume available at http://127.0.0.1:5173');
});
