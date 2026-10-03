'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const manifests = new Map();
async function manifest(root) {
  if (!manifests.has(root)) manifests.set(root, fs.readFile(path.join(root, 'native-seo.json'), 'utf8').then(JSON.parse));
  return manifests.get(root);
}
function send(req, res, type, body, headers = {}) {
  res.writeHead(200, {'Content-Type':type,'Cache-Control':type.startsWith('text/html')?'no-cache':'public, max-age=3600','X-Content-Type-Options':'nosniff',...headers});
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}
async function respond(req, res, url, site, root, social) {
  const data = await manifest(root);
  const pathname = url.pathname;
  const trim = pathname.replace(/\/$/, '') || '/';
  const alias = data.aliases[pathname] || (pathname !== trim && data.pages.some(page=>page.path===trim) ? trim : undefined);
  if (pathname === '/llm.txt' || alias) {
    res.writeHead(308, {Location:site.origin+(pathname === '/llm.txt'?'/llms.txt':alias)});
    res.end();return true;
  }
  if (pathname === '/robots.txt') return send(req,res,'text/plain; charset=utf-8',`User-agent: *\nAllow: /\n\nSitemap: ${site.origin}/sitemap.xml\n`);
  if (['/sitemap.xml','/llms.txt','/llms-full.txt'].includes(pathname)) {
    const body=(await fs.readFile(path.join(root,pathname),'utf8')).replaceAll(data.origin,site.origin).replace(/^# ton\.tx\.taxi$/m,'# '+site.host);
    return send(req,res,pathname.endsWith('.xml')?'application/xml; charset=utf-8':'text/plain; charset=utf-8',body,pathname.endsWith('.xml')?{}:{'X-Robots-Tag':'noindex, follow'});
  }
  const mdPath = pathname === '/index.md' ? '/' : pathname.endsWith('.md') ? pathname.slice(0,-3) : null;
  if (mdPath && data.pages.some(page=>page.path===mdPath)) {
    const body=(await fs.readFile(path.join(root,pathname),'utf8')).replaceAll(data.origin,site.origin).replace(/^# ton\.tx\.taxi$/m,'# '+site.host);
    return send(req,res,'text/markdown; charset=utf-8',body,{'X-Robots-Tag':'noindex, follow',Link:`<${site.origin+mdPath}>; rel="canonical"`});
  }
  const page=data.pages.find(page=>page.path===pathname);
  if (!page) return false;
  const html=await fs.readFile(path.join(root,pathname,'index.html'),'utf8');
  const body=await social.inject(html,pathname,null,null,null,site.host,{...page,preview:data.preview});
  return send(req,res,'text/html; charset=utf-8',body);
}
module.exports={respond};
