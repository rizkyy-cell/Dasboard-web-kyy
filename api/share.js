// File: /api/share.js
// Vercel Serverless Function - Dynamic Meta Tags & Static Banner Image

module.exports = async function handler(req, res) {
  const { id } = req.query;

  const domainUtama = "https://jrxrezkyy-dashboard.vercel.app";
  
  // Gambar Banner Default dari folder public
  const defaultBannerImage = `${domainUtama}/default-banner.jpg`;

  // Teks default jika ID tidak diisi
  let title = "Download Mod Aplikasi";
  let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
  let targetUrl = `${domainUtama}/`;
  let shareUrl = `${domainUtama}/api/share`;

  if (id) {
    targetUrl = `${domainUtama}/?app_id=${id}`;
    shareUrl = `${domainUtama}/api/share?id=${id}`;

    try {
      const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
      const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 

      // Ambil data aplikasi berdasarkan ID dari Supabase
      const apiUrl = `${SUPABASE_URL}/rest/v1/app_mods?id=eq.${id}&select=*`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      const data = await response.json();

      if (data && data.length > 0) {
        const app = data[0];

        // 1. Ambil Nama Aplikasi dari Kolom 'nama_app'
        if (app.nama_app) {
          title = app.nama_app.replace(/<br\s*\/?>/gi, ' ').trim();
        }

        // 2. Ambil Deskripsi dari Kolom 'deskripsi'
        if (app.deskripsi) {
          let cleanDesc = app.deskripsi.replace(/<br\s*\/?>/gi, ' ').trim();
          desc = cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + "..." : cleanDesc;
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data dari Supabase:", err);
    }
  }

  // Respon HTML khusus untuk WhatsApp Crawler
  const htmlResponse = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  
  <!-- OPEN GRAPH META TAGS UNTUK WHATSAPP -->
  <meta property="og:site_name" content="Dashboard Web Kyy" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  
  <!-- GAMBAR BANNER STATIS -->
  <meta property="og:image" content="${defaultBannerImage}" />
  <meta property="og:image:secure_url" content="${defaultBannerImage}" />
  <meta property="og:image:type" content="image/jpeg" />

  <!-- TWITTER CARDS -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${defaultBannerImage}" />

  <!-- AUTOMATIC REDIRECT KE DASHBOARD -->
  <script>
    setTimeout(function() {
      window.location.href = "${targetUrl}";
    }, 150);
  </script>
</head>
<body style="background:#0e1621; color:#ffffff; font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>Membuka ${title}...</p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send(htmlResponse);
};
