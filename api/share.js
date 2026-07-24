// Database sederhana / Map data App Mod berdasarkan ID
const appsData = {
  "7": {
    title: "CAPCUT PRO",
    description: "CapCut mod memberikan pengalaman yang lebih baik kepada pengguna dengan membuka fitur pro yang biasanya memerlukan pembayaran.",
    downloadUrl: "https://jrxrezkyy-dashboard.vercel.app/download/capcut" // URL tujuan setelah user klik
  },
  "8": {
    title: "LIGHTROOM PREMIUM",
    description: "Unduh Lightroom Mod Premium Gratis dengan semua preset dan fitur unlocked.",
    downloadUrl: "https://jrxrezkyy-dashboard.vercel.app/download/lightroom"
  }
};

export default function handler(req, res) {
  const { id } = req.query;

  // Ambil data berdasarkan ID, atau gunakan fallback jika ID tidak ditemukan
  const app = appsData[id] || {
    title: "Download Mod Aplikasi",
    description: "Unduh Mod Premium Gratis di Dashboard Web Kyy!",
    downloadUrl: "https://jrxrezkyy-dashboard.vercel.app"
  };

  // URL Gambar Banner Statis dari domain kamu (Wajib HTTPS & Absolute URL)
  const defaultBannerUrl = "https://jrxrezkyy-dashboard.vercel.app/default-banner.jpg";

  // Template HTML Open Graph untuk WhatsApp / Media Sosial
  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <!-- Open Graph Meta Tags -->
      <meta property="og:title" content="${app.title}" />
      <meta property="og:description" content="${app.description}" />
      <meta property="og:image" content="${defaultBannerUrl}" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://jrxrezkyy-dashboard.vercel.app/api/share?id=${id}" />

      <!-- Automatic Redirect ke halaman aplikasi asli saat dibuka di browser -->
      <meta http-equiv="refresh" content="0;url=${app.downloadUrl}" />

      <title>${app.title}</title>
    </head>
    <body>
      <p>Mengalihkan ke ${app.title}...</p>
      <script>
        window.location.href = "${app.downloadUrl}";
      </script>
    </body>
    </html>
  `;

  // Kirim respon berupa HTML
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
