// api/server.js
export default async function handler(req, res) {
    // 1. Atur izin header CORS agar browser HP Infinix lu tidak diblokir saat mengirim data
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Tanggapan cepat untuk preflight request dari browser
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Pastikan metode yang digunakan adalah POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan. Harus pake POST, Bos Kyy!' });
    }

    try {
        // 2. Ambil data kueri lagu dan waktu yang dikirim dari file HTML lu
        const { kueriUser, waktu } = req.body;

        // 3. Ambil token bot secara aman dari Environment Variable Vercel (Anti-Bocor)
        const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
        const CHAT_ID = '7790447727'; // ID Telegram personal asli lu

        // Pengaman jika token di Vercel lupa dikonfigurasi
        if (!TELEGRAM_TOKEN) {
            return res.status(200).json({ error: '⚠️ Waduh Bos, TELEGRAM_TOKEN kosong di Env Vercel lu!' });
        }

        // Susun format teks notifikasi yang akan masuk ke Telegram
        const pesanBot = `➔ 🎵 Request YT Music Baru (Serverless System):\n\n📌 Judul/Link: ${kueriUser}\n⏰ Waktu: ${waktu || 'Tepat Waktu'}`;

        // 4. Tembak data ke server Telegram menggunakan fetch bawaan Node.js Vercel
        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: pesanBot,
                parse_mode: 'Markdown'
            })
        });

        // Kembalikan status sukses ke frontend web musik lu
        return res.status(200).json({ success: true, message: 'Log Musik Serverless Berhasil Terkirim Aman!' });

    } catch (error) {
        // Tangkap eror jika koneksi server atau API Telegram bermasalah
        return res.status(500).json({ error: `Gagal kirim log: ${error.message}` });
    }
}
