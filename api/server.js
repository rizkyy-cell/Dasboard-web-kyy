// api/server.js
export default async function handler(req, res) {
    // 1. Set header CORS agar aman diakses dari frontend web musik lu
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan. Harus POST, Bos Kyy!' });
    }

    try {
        let { kueriUser, waktu } = req.body;
        const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
        const CHAT_ID = '7790447727'; // ID Telegram personal asli lu

        // Bersihkan url jika user langsung menempelkan link video YouTube biasa
        if (kueriUser.includes('youtube.com/watch?v=')) {
            const urlObj = new URL(kueriUser);
            kueriUser = urlObj.searchParams.get('v');
        } else if (kueriUser.includes('youtu.be/')) {
            kueriUser = kueriUser.split('youtu.be/')[1].split('?')[0];
        }

        // 2. FETCH LIVE DATA DARI YOUTUBE AUDIO
        const urlCari = `https://www.youtube.com/results?search_query=${encodeURIComponent(kueriUser + " audio")}`;
        const responYT = await fetch(urlCari, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const htmlMentah = await responYT.text();

        // 3. EKSTRAKSI DATA MENGGUNAKAN REGEX BINER (LIMIT DIUPGRADE KE 8 TREK AKURAT)
        const regexVideo = /"videoRenderer":{"videoId":"([^"]+)","thumbnail".*?"title":{"runs":\[{"text":"([^"]+)"}\]/g;
        const hasilTrek = [];
        let pencocokan;
        
        // Loop ini diatur maksimal sampai 8 item trek terkumpul
        while ((pencocokan = regexVideo.exec(htmlMentah)) !== null && hasilTrek.length < 8) {
            hasilTrek.push({
                id: pencocokan[1],
                judul: pencocokan[2]
            });
        }

        // 4. PUSH DATA KE TELEGRAM LOG SEBAGAI TRACKING REPORT
        if (TELEGRAM_TOKEN) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: `➔ 🎵 User Nyari Musik Pro:\n\n📌 Kata Kunci: ${kueriUser}\n📊 Menemukan: ${hasilTrek.length} Trek\n⏰ Waktu: ${waktu}`,
                    parse_mode: 'Markdown'
                })
            });
        }

        // Kembalikan 8 data array asli ke frontend web musik lu
        return res.status(200).json({ success: true, data: hasilTrek });

    } catch (error) {
        // Tangkap eror backend agar serverless tidak crash total
        return res.status(500).json({ error: error.message });
    }
}
