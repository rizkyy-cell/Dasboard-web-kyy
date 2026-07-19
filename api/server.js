// api/server.js - FIXED VERSION
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        let { kueriUser, waktu } = req.body;
        
        // Bersihkan URL YouTube jika ada
        if (kueriUser.includes('youtube.com/watch?v=')) {
            const urlObj = new URL(kueriUser);
            kueriUser = urlObj.searchParams.get('v');
        } else if (kueriUser.includes('youtu.be/')) {
            kueriUser = kueriUser.split('youtu.be/')[1].split('?')[0];
        }

        // 1. CARI DI YOUTUBE
        const urlCari = `https://www.youtube.com/results?search_query=${encodeURIComponent(kueriUser + " official")}`;
        const responYT = await fetch(urlCari, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const htmlMentah = await responYT.text();

        const regexVideo = /"videoRenderer":{"videoId":"([^"]+)","thumbnail".*?"title":{"runs":\[{"text":"([^"]+)"}\]/g;
        const hasilTrek = [];
        let pencocokan;
        
        while ((pencocokan = regexVideo.exec(htmlMentah)) !== null && hasilTrek.length < 8) {
            hasilTrek.push({
                id: pencocokan[1],
                judul: pencocokan[2],
                source: 'youtube'
            });
        }

        // 2. JIKA TIDAK KETEMU, CARI DI ODESLI (song.link API)
        if (hasilTrek.length === 0) {
            try {
                const odesliRes = await fetch(
                    `https://api.song.link/v1-alpha.1/search?q=${encodeURIComponent(kueriUser)}&type=track`,
                    { method: 'GET' }
                );
                const odesliData = await odesliRes.json();
                
                if (odesliData.tracks && odesliData.tracks.length > 0) {
                    odesliData.tracks.slice(0, 8).forEach((track, idx) => {
                        hasilTrek.push({
                            id: track.id,
                            judul: `${track.artistName} - ${track.trackName}`,
                            source: 'odesli',
                            spotifyId: track.spotifyId,
                            youtubeId: track.youtubeVideoId
                        });
                    });
                }
            } catch (e) {
                console.log('Odesli API fallback failed', e);
            }
        }

        return res.status(200).json({ 
            success: hasilTrek.length > 0, 
            data: hasilTrek 
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
