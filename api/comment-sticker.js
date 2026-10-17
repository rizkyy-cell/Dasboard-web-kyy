// api/comment-sticker.js
// GET /api/comment-sticker?url=<link TikTok>
// Mengembalikan daftar stiker dari komentar target (dan stiker lain di video) dalam bentuk URL proxy /api/img.
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
const TT_HOST = /(^|\.)tiktok\.com$/i;
const CDN = /(^|\.)(tiktokcdn(-us|-eu)?\.com|byteimg\.com|ibyteimg\.com|ibytedtos\.com|tiktokv\.(com|us|eu)|muscdn\.com|byteoversea\.com|tiktok\.com)$/i;
const PAGE = 50;
const BATCH = 6;
const MAX_OFFSET = PAGE * BATCH * 6;
const LIST_BUDGET_MS = 3000;
const REPLY_START_LIMIT_MS = 6000;
const MAX_OTHERS = 60;
const SKIP_KEY = /^(user|reply_to_user|author|text_extra|label_list|share_info|avatar.*)$/i;
const HINT_KEY = /sticker|image|emoji|gif|animate|media|photo|pic/i;
const URL_PREF = ['animate_url', 'origin_url', 'static_url', 'large_url', 'medium_url', 'crop_url', 'thumb_url'];
const HDR = {
  'user-agent': UA,
  referer: 'https://www.tiktok.com/',
  accept: 'application/json, text/plain, */*',
  'accept-language': 'en-US,en;q=0.9'
};

function coded(code, msg) {
  const e = new Error(msg);
  e.code = code;
  return e;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function timed(url, opts, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
  } finally {
    clearTimeout(t);
  }
}

async function getList(url, tries, ms) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await timed(url, { headers: HDR }, ms);
      const t = await r.text();
      if (r.ok && t) {
        const j = JSON.parse(t);
        if (j && Array.isArray(j.comments)) return j;
      }
    } catch (e) {
      // coba lagi
    }
    if (i < tries - 1) await sleep(200);
  }
  return null;
}

const listUrl = (vid, off) =>
  `https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id=${vid}&count=${PAGE}&cursor=${off}`;
const replyUrl = (vid, cid) =>
  `https://www.tiktok.com/api/comment/list/reply/?aid=1988&item_id=${vid}&comment_id=${cid}&count=${PAGE}&cursor=0`;

async function listComments(vid, deadline) {
  const map = new Map();
  let ok = 0;
  let off = 0;
  let more = true;
  while (more && off < MAX_OFFSET && Date.now() < deadline) {
    const offs = [];
    for (let i = 0; i < BATCH; i++) offs.push(off + i * PAGE);
    const pages = await Promise.all(offs.map((o) => getList(listUrl(vid, o), 2, 2500)));
    more = false;
    pages.forEach((p) => {
      if (!p) return;
      ok++;
      p.comments.forEach((c) => {
        if (c && c.cid != null) map.set(String(c.cid), c);
      });
      const hasMore = p.has_more != null ? !!p.has_more : p.comments.length >= PAGE;
      if (hasMore) more = true;
    });
    if (ok === 0) break;
    off += BATCH * PAGE;
  }
  return { comments: [...map.values()], ok };
}

function idsFrom(u) {
  const m =
    u.pathname.match(/\/(?:video|photo)\/(\d{15,25})/) || u.pathname.match(/\/v\/(\d{15,25})\.html/);
  const cids = [];
  ['share_comment_id', 'comment_id', 'cid', 'reply_comment_id', 'parent_comment_id'].forEach((k) => {
    const v = u.searchParams.get(k);
    if (v && /^\d{10,25}$/.test(v) && !cids.includes(v)) cids.push(v);
  });
  return { vid: m ? m[1] : null, cids };
}

async function resolve(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch (e) {
    throw coded('BAD_LINK', 'Link tidak valid.');
  }
  const cids = [];
  for (let hop = 0; hop < 6; hop++) {
    if (!/^https?:$/.test(u.protocol) || !TT_HOST.test(u.hostname)) {
      throw coded('NOT_TIKTOK', 'Bukan link TikTok.');
    }
    const ids = idsFrom(u);
    ids.cids.forEach((c) => {
      if (!cids.includes(c)) cids.push(c);
    });
    if (ids.vid) return { vid: ids.vid, cids };

    const r = await timed(
      u.href,
      { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*' } },
      4000
    );
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) {
      u = new URL(loc, u);
      continue;
    }
    const html = await r.text();
    const m = html.match(/\/(?:video|photo)\/(\d{15,25})/);
    if (m) return { vid: m[1], cids };
    break;
  }
  throw coded('NO_VIDEO', 'Link tidak mengarah ke video TikTok.');
}

function collect(node, out) {
  if (!node) return out;
  if (typeof node === 'string') {
    if (/^https:\/\//i.test(node) && !out.includes(node)) out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((x) => collect(x, out));
    return out;
  }
  if (typeof node === 'object') {
    if (Array.isArray(node.url_list)) collect(node.url_list, out);
    Object.keys(node).forEach((k) => {
      if (k !== 'url_list') collect(node[k], out);
    });
  }
  return out;
}

function urlsOf(obj) {
  const out = [];
  URL_PREF.forEach((k) => {
    if (obj && obj[k]) collect(obj[k], out);
  });
  if (!out.length) collect(obj, out);
  return out.filter((u) => {
    try {
      return CDN.test(new URL(u).hostname);
    } catch (e) {
      return false;
    }
  });
}

function mediaOf(c) {
  const out = [];
  const user = (c.user && (c.user.nickname || c.user.unique_id)) || '';
  const text = String(c.text || '');
  const push = (kind, obj) => {
    const urls = urlsOf(obj);
    if (urls.length) out.push({ kind, urls, user, text });
  };
  const scan = (hinted) =>
    Object.keys(c).forEach((k) => {
      if (SKIP_KEY.test(k) || (hinted && !HINT_KEY.test(k))) return;
      const v = c[k];
      if (!v || typeof v !== 'object') return;
      (Array.isArray(v) ? v : [v]).forEach((it) => {
        if (it && typeof it === 'object') push(k, it);
      });
    });
  scan(true);
  if (!out.length) scan(false);
  return out;
}

const srcFor = (urls) => '/api/img?' + urls.slice(0, 3).map((u) => 'u=' + encodeURIComponent(u)).join('&');

function buildItems(comments, cids) {
  const targets = [];
  const others = [];
  const seen = new Set();
  comments.forEach((c) => {
    const isT = cids.includes(String(c.cid));
    mediaOf(c).forEach((m) => {
      const key = m.urls[0];
      if (seen.has(key)) return;
      seen.add(key);
      (isT ? targets : others).push({
        kind: m.kind,
        user: m.user,
        text: m.text.slice(0, 80),
        isTarget: isT,
        src: srcFor(m.urls)
      });
    });
  });
  return { targets, others: others.slice(0, MAX_OTHERS) };
}

function getParam(req, name) {
  if (req.query && req.query[name]) return String(req.query[name]);
  try {
    return new URL(req.url, 'http://localhost').searchParams.get(name) || '';
  } catch (e) {
    return '';
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (obj) => {
    res.statusCode = 200;
    res.end(JSON.stringify(obj));
  };
  const start = Date.now();
  try {
    const raw = getParam(req, 'url').trim();
    if (!raw) throw coded('BAD_LINK', 'Link kosong.');

    const { vid, cids } = await resolve(raw);
    const got = await listComments(vid, Date.now() + LIST_BUDGET_MS);
    if (!got.ok) {
      throw coded('BLOCKED', 'TikTok sedang membatasi permintaan. Coba lagi sebentar lagi.');
    }
    const comments = got.comments;
    let b = buildItems(comments, cids);

    if (cids.length && !b.targets.length && Date.now() - start < REPLY_START_LIMIT_MS) {
      const parents = comments
        .filter((c) => (c.reply_comment_total || 0) > 0)
        .sort((x, y) => (y.reply_comment_total || 0) - (x.reply_comment_total || 0))
        .slice(0, 12);
      const replies = await Promise.all(parents.map((p) => getList(replyUrl(vid, p.cid), 1, 2000)));
      const have = new Set(comments.map((c) => String(c.cid)));
      replies.forEach((p) => {
        if (!p) return;
        p.comments.forEach((c) => {
          if (c && c.cid != null && !have.has(String(c.cid))) {
            have.add(String(c.cid));
            comments.push(c);
          }
        });
      });
      b = buildItems(comments, cids);
    }

    const found = b.targets.length > 0;
    const items = [...b.targets, ...b.others];
    if (!items.length) {
      throw coded('NO_MEDIA', 'Tidak ada stiker di komentar video ini. Salin link komentar stikernya.');
    }
    send({ ok: true, found, videoId: vid, items });
  } catch (e) {
    send({
      ok: false,
      code: e.code || 'ERROR',
      error: e.code ? e.message : 'Terjadi gangguan di server. Coba lagi.'
    });
  }
};
