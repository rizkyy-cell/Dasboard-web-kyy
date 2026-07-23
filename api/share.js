// File: /api/share.js
// Menggunakan REST API Native Fetch (Tanpa butuh library Supabase, 100% Anti Crash)

module.exports = async function handler(req, res) {
  const { id } = req.query;

  const domainUtama = "https://jrxrezkyy-dashboard.vercel.app";
  const defaultImage = `${domainUtama}/profile.jpg`;

  // Fallback jika ID tidak ada
  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${domainUtama}/";</script>
      </head>
      <body><p>Mengalihkan ke Dashboard...</p></body>
      </html>
    `);
  }

  try {
    // Memanggil REST API Supabase langsung via fetch
    const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
    const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 

    const apiUrl = `${SUPABASE_URL}/rest/v1/app_mods?id=eq.${id}&select=*`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    const data = await response.json();
    const app = (data && data.length > 0) ? data[0] : null;

    // Nilai Default
    let title = "Download Mod Aplikasi";
    let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
    let imageUrl = defaultImage;
    let targetUrl = `${domainUtama}/?app_id=${id}`;
    let shareUrl = `${domainUtama}/api/share?id=${id}`;

    if (app) {
      title = app.nama_app ? app.nama_app.replace(/<br\s*\/?>/gi, ' ') : title;
      
      if (app.deskripsi) {
        let cleanDesc = app.deskripsi.replace(/<br\s*\/?>/gi, ' ').trim();
        desc = cleanDesc.length > 120 ? cleanDesc.substring(0, 120) + "..." : cleanDesc;
      }

      if (app.img_url) {
        let rawUrl = app.img_url.replace(/<br\s*\/?>/gi, '').trim();
        
        // Perbaikan otomatis domain ImgBB
        if (rawUrl.includes("ibb.co.com")) {
          rawUrl = rawUrl.replace("ibb.co.com", "ibb.co");
        }
        
        imageUrl = rawUrl;
      }
    }

    const htmlResponse = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  
  <!-- OPEN GRAPH META TAGS DIBACA WHATSAPP -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="300" />
  <meta property="og:image:height" content="300" />

  <!-- AUTOMATIC REDIRECT KE DASHBOARD UTAMA -->
  <script>
    window.location.href = "${targetUrl}";
  </script>
</head>
<body style="background:#0e1621; color:#ffffff; font-family:sans-serif; text-align:center; padding-top:50px;">
  <p>Membuka Dashboard Web Kyy untuk ${title}...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(htmlResponse);

  } catch (err) {
    // Jika ada error jaringan, tetap berikan respon aman agar tidak 500
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${domainUtama}/";</script>
      </head>
      <body><p>Mengalihkan ke Dashboard...</p></body>
      </html>
    `);
  }
};
