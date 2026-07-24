// File: /api/share.js
module.exports = async function handler(req, res) {
  const { id } = req.query;
  const domainUtama = "https://jrxrezkyy-dashboard.vercel.app";
  const defaultImage = `${domainUtama}/profile.jpg`;

  if (!id) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<script>window.location.href="${domainUtama}/";</script>`);
  }

  try {
    const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 

    const response = await fetch(`${SUPABASE_URL}/rest/v1/app_mods?id=eq.${id}&select=*`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const data = await response.json();
    const app = (data && data.length > 0) ? data[0] : null;

    let title = "Download Mod Aplikasi";
    let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
    let imageUrl = defaultImage;

    if (app) {
      title = app.nama_app ? app.nama_app.replace(/<br\s*\/?>/gi, ' ').trim() : title;
      if (app.deskripsi) {
        let cleanDesc = app.deskripsi.replace(/<br\s*\/?>/gi, ' ').trim();
        desc = cleanDesc.length > 120 ? cleanDesc.substring(0, 120) + "..." : cleanDesc;
      }
      if (app.img_url) {
        let rawUrl = app.img_url.replace(/<br\s*\/?>/gi, '').trim();
        
        // PASTIIN LINK IMGBB DIBUAT JADI LINK GAMBAR MURNI
        if (rawUrl.includes("ibb.co.com")) {
          rawUrl = rawUrl.replace("ibb.co.com", "i.ibb.co");
        } else if (rawUrl.includes("ibb.co") && !rawUrl.includes("i.ibb.co")) {
          rawUrl = rawUrl.replace("ibb.co", "i.ibb.co");
        }
        imageUrl = rawUrl;
      }
    }

    // HTML DENGAN META TAG OPEN GRAPH LENGKAP
    const htmlResponse = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta property="og:site_name" content="Dashboard Web Kyy" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:width" content="300" />
  <meta property="og:image:height" content="300" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:image" content="${imageUrl}" />
  <script>
    setTimeout(function() {
      window.location.href = "${domainUtama}/?app_id=${id}";
    }, 200);
  </script>
</head>
<body style="background:#0e1621; color:#fff; text-align:center; padding-top:50px;">
  <p>Membuka Dashboard Web Kyy...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlResponse);

  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<script>window.location.href="${domainUtama}/";</script>`);
  }
};
