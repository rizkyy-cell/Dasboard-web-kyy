// File: /api/share.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://djojqarslfsvubuflwdn.supabase.co";
const SUPABASE_KEY = "sb_publishable_vqUvkJX5XNx5_D75lCnJzw_KPeFSim9"; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send("ID Aplikasi tidak valid.");
  }

  try {
    // 1. Ambil data aplikasi mod dari Supabase berdasarkan ID
    const { data: app, error } = await supabase
      .from('app_mods')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !app) {
      return res.status(404).send("Aplikasi tidak ditemukan.");
    }

    const title = app.nama_app || "Download Mod Aplikasi";
    const desc = app.deskripsi ? app.deskripsi.replace(/<br\s*\/?>/gi, ' ').substring(0, 150) + "..." : "Unduh Mod Premium Gratis!";
    
    // Menggunakan Link Ikon dari database sebagai Banner WA
    const imageUrl = app.img_url || "https://jrxrezkyy-dashboard.vercel.app/profile.jpg";
    
    // TUJUAN REDIRECT: Masuk ke Dashboard Utama Web Kamu lebih dulu!
    const dashboardUrl = `https://jrxrezkyy-dashboard.vercel.app/?app_id=${app.id}`;

    // 2. Berikan tag og:image untuk WhatsApp
    const html = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        
        <!-- OPEN GRAPH META TAGS UNTUK PREVIEW BANNER DI WA -->
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${desc}" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="og:image:type" content="image/jpeg" />

        <!-- REDIRECT MASUK KE DASHBOARD KITA -->
        <script>
          window.location.href = "${dashboardUrl}";
        </script>
      </head>
      <body style="background:#0e1621; color:#ffffff; font-family:sans-serif; text-align:center; padding-top:50px;">
        <p>Membuka Dashboard Web Kyy...</p>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (err) {
    return res.status(500).send("Terjadi kesalahan server.");
  }
}
