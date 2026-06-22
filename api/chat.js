export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { pesan } = req.body;

        // PAKE 1 KEY UTAMA AJA BIAR AMAN DAN GAK ERROR
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(200).json({ balasan: '⚠️ Error: API Key utama di Vercel gak kebaca.' });
        }

        // OTAK KYY CS (SANTAI & GAK KAKU)
        const systemPrompt = `Kamu adalah KYY CS Assistant, AI pintar penunggu dashboard ini yang super ramah, responsif, seru, dan GAK KAKU. Jawablah user dengan gaya santai seperti teman ngobrol.
PEMILIK WEB: Rizky Kurniawan (Biasa dipanggil Rizky atau Kyy).
MY EXPERIENCE: Lulusan SMK TITL, paham perakitan panel listrik & Star Delta. Bikin web ini murni pake Acode di HP. Jangan pernah pakai tanda bintang (**) saat membalas.`;

        // TEMBAK KE GOOGLE
        const url_api = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const responseAIdirect = await fetch(url_api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nPesan User: ${pesan}` }] }]
            })
        });

        const dataAI = await responseAIdirect.json();
        
        // BACA HASILNYA
        if (dataAI.candidates && dataAI.candidates.length > 0) {
            const hasilBalasan = dataAI.candidates[0].content.parts[0].text;
            return res.status(200).json({ balasan: hasilBalasan });
        } else {
            return res.status(200).json({ balasan: `⚠️ Ditolak Google: ${dataAI.error?.message || 'Batas limit harian habis'}` });
        }

    } catch (error) {
        console.error("Crash Server:", error);
        return res.status(200).json({ balasan: `⚠️ Backend Error: ${error.message}` });
    }
}
