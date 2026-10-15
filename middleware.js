import { sha256 } from './js/sha256.js'; // 需新建或引入SHA-256实现


// Vercel Middleware to inject environment variables
export default async function middleware(request) {
  // Guard against re-processing our own internal subrequest (prevents infinite loop)
  if (request.headers.get('x-middleware-subrequest')) {
    return;
  }


  // Get the URL from the request
  const url = new URL(request.url);
  
  // Only process HTML pages
  const isHtmlPage = url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (!isHtmlPage) {
    return; // Let the request pass through unchanged
  }


  // Fetch the original response via a marked subrequest so this middleware does not re-run
  const subRequest = new Request(request, {
    headers: { ...Object.fromEntries(request.headers), 'x-middleware-subrequest': '1' },
  });
  const response = await fetch(subRequest);
  
  // Check if it's an HTML response
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response; // Return the original response if not HTML
  }


  // Get the HTML content
  const originalHtml = await response.text();
  
  // Replace the placeholder with actual environment variable
  // If PASSWORD is not set, replace with empty string
  const password = process.env.PASSWORD || '';
  let passwordHash = '';
  if (password) {
    passwordHash = await sha256(password);
  }
  
  // 替换密码占位符
  let modifiedHtml = originalHtml.replace(
    'window.__ENV__.PASSWORD = "{{PASSWORD}}";',
    `window.__ENV__.PASSWORD = "${passwordHash}"; // SHA-256 hash`
  );


  // 修复Response构造
  return new Response(modifiedHtml, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}


export const config = {
  runtime: 'edge',
  matcher: ['/', '/((?!api|_next/static|_vercel|favicon.ico).*)'],
};
