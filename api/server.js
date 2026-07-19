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

        // Query Odesli API untuk dapat Spotify ID + metadata
        const odesliRes = await fetch(
            `https://api.song.link/v1-alpha.1/search?q=${encodeURIComponent(kueriUser)}&type=track`
        );
        
        if (!odesliRes.ok) {
            throw new Error('Odesli API error');
        }

        const odesliData = await odesliRes.json();
        
        if (!odesliData.tracks || odesliData.tracks.length === 0) {
            return res.status(200).json({ 
                success: false,
                data: []
            });
        }

        // Extrak dari 8 hasil pertama
        const hasilTrek = odesliData.tracks.slice(0, 8).map((track) => {
            // Cari Spotify ID dari linksByPlatform
            let spotifyId = null;
            if (track.linksByPlatform?.spotify) {
                const spotifyUrl = track.linksByPlatform.spotify;
                // Extract ID dari URL: https://open.spotify.com/track/ID atau spotify:track:ID
                spotifyId = spotifyUrl.split('/').pop()?.split('?')[0] || spotifyUrl.split(':').pop();
            }

            return {
                id: track.id || spotifyId, // Fallback ke spotify ID
                judul: `${track.artistName} - ${track.trackName}`,
                spotifyId: spotifyId,
                cover: track.thumbnailUrl || null,
                links: track.linksByPlatform || {}
            };
        });

        return res.status(200).json({ 
            success: true,
            data: hasilTrek
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
