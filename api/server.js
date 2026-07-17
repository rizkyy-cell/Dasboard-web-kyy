// api/server.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan, Bos Kyy!' });
    }

    try {
        let { kueriUser, waktu } = req.body;
        const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
        const CHAT_ID = '7790447727'; 

        if (kueriUser.includes('youtube.com/watch?v=')) {
            const urlObj = new URL(kueriUser);
            kueriUser = urlObj.searchParams.get('v');
        } else if (kueriUser.includes('youtu.be/')) {
            kueriUser = kueriUser.split('youtu.be/')[1].split('?')[0];
        }

        const urlCari = `https://www.youtube.com/results?search_query=${encodeURIComponent(kueriUser + " audio")}`;
        const responYT = await fetch(urlCari, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const htmlMentah = await responYT.text();

        const regexVideo = /"videoRenderer":{"videoId":"([^"]+)","thumbnail".*?"title":{"runs":\[{"text":"([^"]+)"}\]/g;
        const hasilTrek = [];
        let pencocokan;
        
        while ((pencocokan = regexVideo.exec(htmlMentah)) !== null && hasilTrek.length < 8) {
            const vId = pencocokan[1];
            hasilTrek.push({
                id: vId,
                judul: pencocokan[2],
                // LOGIKA KRUSIAL: Sediakan Link Stream Mentah MP3 Universal lewat API Gateway Converter yang Stabil
                streamUrl: `https://cobalt.tools/api/stream?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + vId)}`
            });
        }

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

        return res.status(200).json({ success: true, data: hasilTrek });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
