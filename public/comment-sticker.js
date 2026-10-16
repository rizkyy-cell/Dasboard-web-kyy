// api/comment-sticker.js
// Vercel Serverless Function (Node 18+, tanpa dependency).
// Input : GET /api/comment-sticker?url=<link komentar TikTok>
// Output: JSON { ok, found, items: [{ cid, kind, user, text, mime, data }] }

const UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

const TT_HOST = /(^|\.)tiktok\.com$/i;
const CDN_HOST =
  /(^|\.)(tiktokcdn(-us|-eu)?\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com|tiktokv\.(com|us|eu)|muscdn\.com|byteoversea\.com|tiktok\.com)$/i;

const PAGE_CURSORS = [0, 50, 100, 150, 200, 250, 300, 350];
const MAX_OTHERS = 8;
const TARGET_MAX_BYTES = 1500 * 1024;
const OTHER_MAX_BYTES = 400 * 1024;
const TOTAL_BUDGET = 3200 * 1024;

async function timedFetch(url, opts, ms) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms || 5000);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
  } finally {
    clearTimeout(timer);
  }
}

function parseIds(href) {
  let u;
  try {
    u = new URL(href);
  } catch (e) {
    return { videoId: null, commentIds: [] };
  }
  const m =
    u.pathname.match(/\/(?:video|photo)\/(\d{15,25})/) ||
    u.pathname.match(/\/v\/(\d{15,25})\.html/);
  const keys = ['share_comment_id', 'comment_id', 'cid', 'reply_comment_id', 'parent_comment_id'];
  const commentIds = [];
  keys.forEach((k) => {
    const v = u.searchParams.get(k);
    if (v && /^\d{10,25}$/.test(v) && commentIds.indexOf(v) === -1) commentIds.push(v);
  });
  return { videoId: m ? m[1] : null, commentIds };
}

async function resolveLink(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    throw new Error('Link tidak valid');
  }
  let commentIds = [];
  for (let hop = 0; hop < 6; hop++) {
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('Link tidak valid');
    if (!TT_HOST.test(u.hostname)) throw new Error('Bukan link TikTok');

    const ids = parseIds(u.href);
    ids.commentIds.forEach((c) => {
      if (commentIds.indexOf(c) === -1) commentIds.push(c);
    });
    if (ids.videoId) return { videoId: ids.videoId, commentIds };

    const r = await timedFetch(
      u.href,
      { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*' } },
      5000
    );
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) {
      u = new URL(loc, u);
      continue;
    }
    const html = await r.text();
    const m = html.match(/\/(?:video|photo)\/(\d{15,25})/);
    if (m) return { videoId: m[1], commentIds };
    break;
  }
  throw new Error('Link tidak dikenali sebagai link video/komentar TikTok');
}

const API_HEADERS = {
  'user-agent': UA,
  referer: 'https://www.tiktok.com/',
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9'
};

async function fetchJson(url) {
  try {
    const r = await timedFetch(url, { headers: API_HEADERS }, 6000);
    const text = await r.text();
    if (!text) return { blocked: true, comments: [] };
    const j = JSON.parse(text);
    return { blocked: false, comments: Array.isArray(j.comments) ? j.comments : [] };
  } catch (e) {
    return { blocked: true, comments: [] };
  }
}

function fetchCommentPage(videoId, cursor) {
  return fetchJson(
    'https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=' +
      videoId +
      '&count=50&cursor=' +
      cursor
  );
}

function fetchReplyPage(videoId, commentId) {
  return fetchJson(
    'https://www.tiktok.com/api/comment/list/reply/?aid=1988&item_id=' +
      videoId +
      '&comment_id=' +
      commentId +
      '&count=50&cursor=0'
  );
}

// Kumpulkan semua URL https dari node (urutan: url_list lebih dulu)
function collectUrls(node, out) {
  if (!node) return out;
  if (typeof node === 'string') {
    if (/^https?:\/\//i.test(node) && out.indexOf(node) === -1) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((x) => collectUrls(x, out));
    return out;
  }
  if (typeof node === 'object') {
    if (Array.isArray(node.url_list)) collectUrls(node.url_list, out);
    Object.keys(node).forEach((k) => {
      if (k !== 'url_list') collectUrls(node[k], out);
    });
  }
  return out;
}

function pick(obj, keys) {
  const out = [];
  keys.forEach((k) => {
    if (obj && obj[k]) collectUrls(obj[k], out);
  });
  return out.length ? out : collectUrls(obj, []);
}

function mediaOf(c) {
  const result = [];
  const user = (c.user && (c.user.nickname || c.user.unique_id)) || '';
  const text = c.text || '';

  if (c.sticker) {
    const urls = pick(c.sticker, ['static_url', 'animate_url']);
    if (urls.length) result.push({ cid: String(c.cid), kind: 'sticker', urls, user, text });
  }
  if (Array.isArray(c.image_list)) {
    c.image_list.forEach((im) => {
      const urls = pick(im, ['origin_url', 'crop_url', 'large_url', 'medium_url', 'thumb_url']);
      if (urls.length) result.push({ cid: String(c.cid), kind: 'image', urls, user, text });
    });
  }
  return result;
}

function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.slice(0, 4).toString('latin1') === 'GIF8') return 'image/gif';
  if (buf.slice(0, 4).toString('latin1') === 'RIFF' && buf.slice(8, 12).toString('latin1') === 'WEBP')
    return 'image/webp';
  if (buf.slice(4, 8).toString('latin1') === 'ftyp') {
    const brand = buf.slice(8, 12).toString('latin1');
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    return 'image/heic';
  }
  return null;
}

async function download(urls, maxBytes) {
  for (const u of urls.slice(0, 3)) {
    try {
      const h = new URL(u);
      if (h.protocol !== 'https:' || !CDN_HOST.test(h.hostname)) continue;
      const r = await timedFetch(
        u,
        { headers: { 'user-agent': UA, referer: 'https://www.tiktok.com/' } },
        6000
      );
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length || buf.length > maxBytes) continue;
      const mime = sniff(buf);
      if (!mime) continue;
      return { mime, bytes: buf.length, data: 'data:' + mime + ';base64,' + buf.toString('base64') };
    } catch (e) {
      // coba URL berikutnya
    }
  }
  return null;
}

function queryUrl(req) {
  if (req.query && req.query.url) return String(req.query.url);
  try {
    return new URL(req.url, 'http://localhost').searchParams.get('url') || '';
  } catch (e) {
    return '';
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const raw = queryUrl(req).trim();
    if (!raw) throw new Error('Parameter url kosong');

    const { videoId, commentIds } = await resolveLink(raw);

    // 1) Ambil komentar utama (paralel)
    const pages = await Promise.all(PAGE_CURSORS.map((c) => fetchCommentPage(videoId, c)));
    const seen = new Set();
    let comments = [];
    pages.forEach((p) =>
      p.comments.forEach((c) => {
        const id = String(c.cid);
        if (!seen.has(id)) {
          seen.add(id);
          comments.push(c);
        }
      })
    );
    if (!comments.length && pages.every((p) => p.blocked)) {
      throw new Error('TikTok menolak permintaan server. Coba lagi beberapa saat.');
    }

    const hasTarget = () => comments.some((c) => commentIds.indexOf(String(c.cid)) !== -1 && mediaOf(c).length);

    // 2) Jika komentar yang dicari belum ketemu, cek balasan (reply)
    if (commentIds.length && !hasTarget()) {
      const parents = comments
        .filter((c) => c.reply_comment_total > 0 || commentIds.indexOf(String(c.cid)) !== -1)
        .sort((a, b) => {
          const am = commentIds.indexOf(String(a.cid)) !== -1 ? 1 : 0;
          const bm = commentIds.indexOf(String(b.cid)) !== -1 ? 1 : 0;
          return bm - am || (b.reply_comment_total || 0) - (a.reply_comment_total || 0);
        })
        .slice(0, 12);
      const replyPages = await Promise.all(parents.map((p) => fetchReplyPage(videoId, p.cid)));
      replyPages.forEach((p) =>
        p.comments.forEach((c) => {
          const id = String(c.cid);
          if (!seen.has(id)) {
            seen.add(id);
            comments.push(c);
          }
        })
      );
    }

    // 3) Pisahkan target dan kandidat lain
    const targetMedia = [];
    const otherMedia = [];
    comments.forEach((c) => {
      const media = mediaOf(c);
      if (!media.length) return;
      if (commentIds.indexOf(String(c.cid)) !== -1) targetMedia.push.apply(targetMedia, media);
      else otherMedia.push.apply(otherMedia, media);
    });

    const found = targetMedia.length > 0;
    if (commentIds.length && !found && !otherMedia.length) {
      throw new Error('Komentar itu tidak berisi stiker/gambar, atau tidak ditemukan');
    }
    if (!commentIds.length && !otherMedia.length) {
      throw new Error('Tidak ada stiker di komentar video ini. Salin link komentar stikernya.');
    }

    const queue = targetMedia.concat(otherMedia.slice(0, MAX_OTHERS));
    const targetCount = targetMedia.length;

    // 4) Unduh gambar di server (hindari CORS & hotlink)
    const downloaded = await Promise.all(
      queue.map((m, i) => download(m.urls, i < targetCount ? TARGET_MAX_BYTES : OTHER_MAX_BYTES))
    );

    let budget = TOTAL_BUDGET;
    const items = [];
    queue.forEach((m, i) => {
      const d = downloaded[i];
      if (!d || d.bytes > budget) return;
      budget -= d.bytes;
      items.push({
        cid: m.cid,
        kind: m.kind,
        user: m.user,
        text: m.text,
        mime: d.mime,
        isTarget: i < targetCount,
        data: d.data
      });
    });

    if (!items.length) throw new Error('Gambar stiker gagal diunduh (link kedaluwarsa?). Coba salin ulang.');

    return res.status(200).json({
      ok: true,
      found: items.some((x) => x.isTarget),
      videoId,
      items
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e && e.message ? e.message : 'Gagal' });
  }
};
