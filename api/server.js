// api/server.js
const axios = require('axios');

export default async function handler(req, res) {
    // Memberikan izin akses agar browser HP lu gak kena blokir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metode panggil harus POST, Bos Kyy!' });
    }

    const { kueriUser, waktu } = req.body;

    const TELEGRAM_TOKEN = '8805663861:AAHs7QmTIhp2Tzv_WbWrjb3TzZuUSWUi2IU';
    const CHAT_ID = '7790447727'; // ID Telegram asli lu dari screenshot sebelumnya
    
    const pesanBot = `➔ 🎵 Request Lagu Masuk:\n\n📌 Judul/Link: ${kueriUser}\n⏰ Waktu: ${waktu}`;

    try {
        // Mengirimkan log pencarian lagu langsung ke Telegram via Webhook resmi
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: CHAT_ID,
            text: pesanBot,
            parse_mode: 'Markdown'
        });

        return res.status(200).json({ success: true, message: 'Webhook Telegram Aktif!' });
    } catch (error) {
        return res.status(500).json({ error: 'Gagal koneksi ke Telegram API' });
    }
}
