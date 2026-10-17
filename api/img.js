// api/img.js
// GET /api/img?u=<url CDN TikTok>&u=<url cadangan>
// Mengambil gambar stiker dari CDN TikTok lewat server (hindari CORS). Hanya host CDN TikTok yang diizinkan.
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const CDN = /(^|\.)(tiktokcdn(-us|-eu)?\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com|tiktokv\.(com|us|eu)|muscdn\.com|byteoversea\.com|tiktok\.com)$/i;
const MAX_BYTES = 3 * 1024 * 1024;

function sniff(b) {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'image/gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function timed(url, opts, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
  } finally {
    clearTimeout(t);
  }
}

function getUrls(req) {
  if (req.query && req.query.u) return [].concat(req.query.u);
  try {
    return new URL(req.url, 'http://localhost').searchParams.getAll('u');
  } catch (e) {
    return [];
  }
}

module.exports = async (req, res) => {
  const start = Date.now();
  for (const raw of getUrls(req).slice(0, 3)) {
    if (Date.now() - start > 7000) break;
    let u;
    try {
      u = new URL(raw);
    } catch (e) {
      continue;
    }
    if (u.protocol !== 'https:' || !CDN.test(u.hostname)) continue;
    try {
      const r = await timed(
        u.href,
        { headers: { 'user-agent': UA, referer: 'https://www.tiktok.com/', accept: 'image/webp,image/*,*/*' } },
        4000
      );
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > MAX_BYTES) continue;
      const type = sniff(buf);
      if (!type) continue;
      res.statusCode = 200;
      res.setHeader('Content-Type', type);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      return res.end(buf);
    } catch (e) {
      // coba URL berikutnya
    }
  }
  res.statusCode = 404;
  res.setHeader('Cache-Control', 'no-store');
  res.end();
};
