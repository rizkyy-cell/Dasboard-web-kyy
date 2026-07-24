// File: /api/share.js
// Vercel Serverless Function - Dynamic Meta Tags & Static Banner Image

module.exports = async function handler(req, res) {
  // 1. Tangkap parameter ID dari query URL (?id=...)
  const { id } = req.query;

  const domainUtama = "https://jrxrezkyy-dashboard.vercel.app";
  
  // Gambar Banner Default (Statis) dari folder public Vercel
  const defaultBannerImage = `${domainUtama}/default-banner.jpg`;

  // Nilai Fallback Default jika ID tidak ditemukan atau terjadi kesalahan
  let title = "Download Mod Aplikasi";
  let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
  let targetUrl = `${domainUtama}/`;
  let shareUrl = `${domainUtama}/api/share`;

  if (id) {
    targetUrl = `${domainUtama}/?app_id=${id}`;
    shareUrl = `${domainUtama}/api/share?id=${id}`;

    try {
      // Credentials Supabase
      const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
      const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 

      // 2. Tarik Data Aplikasi dari Database Supabase via Native Fetch REST API
      const apiUrl = `${SUPABASE_URL}/rest/v1/app_mods?id=eq.${id}&select=*`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (response.ok) {
        const data = await response.json();

        if (data && data.length > 0) {
          const app = data[0];

          // Ambil Nama Aplikasi
          if (app.nama_app) {
            title = app.nama_app.replace(/<br\s*\/?>/gi, ' ').trim();
          }

          // Ambil Deskripsi Aplikasi & Bersihkan Tag HTML <br>
          if (app.deskripsi) {
            let cleanDesc = app.deskripsi.replace(/<br\s*\/?>/gi, ' ').trim();
            // Batasi panjang deskripsi max 150 karakter agar tidak terpotong jelek di WA
            desc = cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + "..." : cleanDesc;
          }
        }
      }
    } catch (err) {
      console.error("Gagal koneksi ke Supabase REST API:", err);
    }
  }

  // 3. Render HTML khusus dengan Meta Tag Open Graph untuk WhatsApp & Medsos Crawler
  const htmlResponse = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  
  <!-- OPEN GRAPH METADATA UNTUK WHATSAPP / TELEGRAM / FACEBOOK -->
  <meta property="og:site_name" content="Dashboard Web Kyy" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  
  <!-- BANNER GAMBAR STATIS DARI DOMAIN UTAMA -->
  <meta property="og:image" content="${defaultBannerImage}" />
  <meta property="og:image:secure_url" content="${defaultBannerImage}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <!-- TWITTER CARDS UNTUK BANNER BESAR -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${defaultBannerImage}" />

  <!-- REDIRECT PENGGUNA MANUSIA KE DASHBOARD PUBLIK -->
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

  // 4. Kirim Header HTTP & Respon HTML
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send(htmlResponse);
};
