// api/server.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Harus POST!' });

    try {
        const { kueriUser, waktu } = req.body;
        const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
        const CHAT_ID = '7790447727';

        // 1. LOGIKA UTAMA: FETCH LIVE DATA DARI YOUTUBE (ANTI-HARDCODED)
        const urlCari = `https://www.youtube.com/results?search_query=${encodeURIComponent(kueriUser + " audio")}`;
        const responYT = await fetch(urlCari, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const htmlMentah = await responYT.text();

        // 2. EKSTRAKSI DATA MENGGUNAKAN SENSOR REGEX BINER
        const regexVideo = /"videoRenderer":{"videoId":"([^"]+)","thumbnail".*?"title":{"runs":\[{"text":"([^"]+)"}\]/g;
        const hasilTrek = [];
        let pencocokan;
        
        while ((pencocokan = regexVideo.exec(htmlMentah)) !== null && hasilTrek.length < 4) {
            hasilTrek.push({
                id: pencocokan[1],
                judul: pencocokan[2]
            });
        }

        // 3. PUSH LOG KE TELEGRAM SEPERTI BIASA
        if (TELEGRAM_TOKEN) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: `➔ 🎵 User Nyari Musik:\n\n📌 Kata Kunci: ${kueriUser}\n📊 Menemukan: ${hasilTrek.length} Trek\n⏰ Waktu: ${waktu}`,
                    parse_mode: 'Markdown'
                })
            });
        }

        // Kembalikan array hasil pencarian asli ke frontend web
        return res.status(200).json({ success: true, data: hasilTrek });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
