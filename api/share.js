// File: /api/share.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async function handler(req, res) {
  const { id } = req.query;

  const domainUtama = "https://jrxrezkyy-dashboard.vercel.app";
  const defaultImage = `${domainUtama}/profile.jpg`;

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
      <body><p>Mengalihkan...</p></body>
      </html>
    `);
  }

  try {
    const { data: app, error } = await supabase
      .from('app_mods')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    let title = "Download Mod Aplikasi";
    let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
    let imageUrl = defaultImage;
    let targetUrl = `${domainUtama}/?app_id=${id}`;
    let shareUrl = `${domainUtama}/api/share?id=${id}`;

    if (app && !error) {
      title = app.nama_app ? app.nama_app.replace(/<br\s*\/?>/gi, ' ') : title;
      
      if (app.deskripsi) {
        let cleanDesc = app.deskripsi.replace(/<br\s*\/?>/gi, ' ').trim();
        desc = cleanDesc.length > 120 ? cleanDesc.substring(0, 120) + "..." : cleanDesc;
      }

      if (app.img_url) {
        let rawUrl = app.img_url.replace(/<br\s*\/?>/gi, '').trim();
        
        // PEMBERSIHAN LINK IMGBB AGAR DIBACA SEBAGAI GAMBAR MURNI OLEH WHATSAPP
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
  
  <!-- META TAG OPEN GRAPH PRESISI WHATSAPP -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${shareUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="300" />
  <meta property="og:image:height" content="300" />

  <!-- REDIRECT PENGGUNA MANUSIA KE DASHBOARD PUBLIK -->
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
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${domainUtama}/";</script>
      </head>
      <body><p>Mengalihkan...</p></body>
      </html>
    `);
  }
};
.from('app_mods')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    // Data variabel Open Graph
    let title = "Download Mod Aplikasi";
    let desc = "Unduh Mod Premium Gratis di Dashboard Web Kyy!";
    let imageUrl = defaultImage;
    let targetUrl = `${defaultDashboard}?app_id=${id}`;

    if (app && !error) {
      title = app.nama_app || title;
      desc = app.deskripsi ? app.deskripsi.replace(/<br\s*\/?>/gi, ' ').substring(0, 150) + "..." : desc;
      imageUrl = app.img_url ? app.img_url.replace(/<br\s*\/?>/gi, '') : defaultImage;
    }

    // Respon HTML berisi Open Graph Meta Tag untuk WhatsApp
    const htmlResponse = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  
  <!-- OPEN GRAPH META TAGS UNTUK WHATSAPP / TELEGRAM BANNER -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:type" content="image/jpeg" />

  <!-- REDIRECT PENGGUNA MASUK KE DASHBOARD UTAMA -->
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
    // Jika ada kegagalan server, alihkan pengguna secara aman ke dashboard utama
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${defaultDashboard}";</script>
      </head>
      <body><p>Mengalihkan ke Dashboard...</p></body>
      </html>
    `);
  }
};
