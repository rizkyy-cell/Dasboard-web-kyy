// File: /api/share.js
// REST API Native Fetch + Meta Tag WhatsApp & Twitter Card Optimised

module.exports = async function handler(req, res) {
  const { id } = req.query;

  const domainUtama = "https://jrxrezkyy-dashboard.vercel.app";
  const defaultImage = `${domainUtama}/profile.jpg`;

  if (!id) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>Dashboard Web Kyy</title>
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:description" content="Kumpulan Tools dan Mod Aplikasi Premium." />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${domainUtama}/";</script>
      </head>
      <body><p>Mengalihkan ke Dashboard...</p></body>
      </html>
    `);
  }

  try {
    const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 

    // Ambil data langsung lewat REST API Supabase
    const apiUrl = `${SUPABASE_URL}/rest/v1/app_mods?id=eq.${id}&select=*`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const data = await response.json();
    const app = (data && data.length > 0) ? data[0] : null;

    let title = "Download Mod Aplikasi";
    let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
    let imageUrl = defaultImage;
    let targetUrl = `${domainUtama}/?app_id=${id}`;
    let shareUrl = `${domainUtama}/api/share?id=${id}`;

    if (app) {
      // Clean Teks & HTML Br
      title = app.nama_app ? app.nama_app.replace(/<br\s*\/?>/gi, ' ').trim() : title;
      
      if (app.deskripsi) {
        let cleanDesc = app.deskripsi.replace(/<br\s*\/?>/gi, ' ').trim();
        desc = cleanDesc.length > 120 ? cleanDesc.substring(0, 120) + "..." : cleanDesc;
      }

      if (app.img_url) {
        let rawUrl = app.img_url.replace(/<br\s*\/?>/gi, '').trim();
        
        // Konversi domain ImgBB ke CDN murni
        if (rawUrl.includes("ibb.co.com")) {
          rawUrl = rawUrl.replace("ibb.co.com", "ibb.co");
        }
        
        imageUrl = rawUrl;
      }
    }

    // HTML Khusus dibaca oleh Crawler WhatsApp & Social Media
    const htmlResponse = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  
  <!-- OPEN GRAPH META TAGS (WHATSAPP / TELEGRAM / FACEBOOK) -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="300" />
  <meta property="og:image:height" content="300" />

  <!-- TWITTER CARDS (UNTUK PREVIEW WA & DOKUMEN TINGKAT DUA) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- REDIRECT PENGGUNA MANUSIA KE DASHBOARD -->
  <script>
    setTimeout(function() {
      window.location.href = "${targetUrl}";
    }, 100);
  </script>
</head>
<body style="background:#0e1621; color:#ffffff; font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>Membuka Dashboard Web Kyy untuk ${title}...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(htmlResponse);

  } catch (err) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${domainUtama}/";</script>
      </head>
      <body><p>Mengalihkan ke Dashboard...</p></body>
      </html>
    `);
  }
};
