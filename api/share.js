// File: /api/share.js
// Menggunakan sintaks CommonJS (require) agar kebal error Vercel Serverless
const { createClient } = require('@supabase/supabase-js');

// Inisialisasi Supabase Client
const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = async function handler(req, res) {
  // Ambil ID dari URL query (?id=...)
  const { id } = req.query;

  // URL fallback default jika terjadi kegagalan
  const defaultDashboard = "https://jrxrezkyy-dashboard.vercel.app/";
  const defaultImage = "https://jrxrezkyy-dashboard.vercel.app/profile.jpg";

  if (!id) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="og:title" content="Dashboard Web Kyy" />
        <meta property="og:description" content="Kumpulan Tools dan Mod Aplikasi Premium." />
        <meta property="og:image" content="${defaultImage}" />
        <script>window.location.href = "${defaultDashboard}";</script>
      </head>
      <body><p>Mengalihkan ke Dashboard...</p></body>
      </html>
    `);
  }

  try {
    // Tarik data aplikasi berdasarkan ID dari Supabase
    const { data: app, error } = await supabase
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
