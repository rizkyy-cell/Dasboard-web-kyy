export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { pesan, riwayat, gambarData, gambarType } = req.body;

        const kumpulanKeys = [
            process.env.GEMINI_API_KEY,    
            process.env.GEMINI_API_KEY_2,  
            process.env.GEMINI_API_KEY_3,  
            process.env.GEMINI_API_KEY_4,  
            process.env.GEMINI_API_KEY_5   
        ].filter(Boolean);

        if (kumpulanKeys.length === 0) {
            return res.status(200).json({ balasan: '⚠️ API Key kosong di Vercel!' });
        }

        const keyTerpilih = kumpulanKeys[Math.floor(Math.random() * kumpulanKeys.length)];

        // System prompt utama
        const systemPrompt = `... (isi system prompt kamu) ...`;

        // FORMAT MEMORI UNTUK GEMINI API
        // Konversi array riwayat dari frontend ke struktur 'contents' resmi Gemini
        let contents = [];

        // Masukkan System Instruction sebagai pesan awal dari 'user'
        contents.push({
            role: 'user',
            parts: [{ text: `[SYSTEM INSTRUCTION]\n${systemPrompt}` }]
        });
        contents.push({
            role: 'model',
            parts: [{ text: 'Siap Bos, instruksi sistem dimengerti!' }]
        });

        // Jika ada riwayat percakapan sebelumnya, masukkan ke contents
        if (Array.isArray(riwayat) && riwayat.length > 0) {
            riwayat.forEach(item => {
                const roleGemini = item.role === 'user' ? 'user' : 'model';
                contents.push({
                    role: roleGemini,
                    parts: [{ text: item.content }]
                });
            });
        } else {
            // Jika riwayat kosong, kirim pesan terbaru saja
            const partsPesan = [{ text: pesan }];
            if (gambarData && gambarType) {
                const cleanBase64 = gambarData.includes(',') ? gambarData.split(',')[1] : gambarData;
                partsPesan.push({ inlineData: { mimeType: gambarType, data: cleanBase64 } });
            }
            contents.push({ role: 'user', parts: partsPesan });
        }

        const url_api = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${keyTerpilih}`;

        const responseAIdirect = await fetch(url_api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: contents })
        });

        if (!responseAIdirect.ok) {
            const errorText = await responseAIdirect.text();
            console.error("Detail Error Google Studio:", errorText);
            return res.status(200).json({ balasan: `⚠️ Google API menolak request (Status ${responseAIdirect.status}).` });
        }

        const dataAI = await responseAIdirect.json();
        
        if (dataAI.candidates && dataAI.candidates.length > 0) {
            const teksBalasan = dataAI.candidates[0].content?.parts?.[0]?.text;
            return res.status(200).json({ balasan: teksBalasan || '⚠️ Respons kosong.' });
        } else {
            return res.status(200).json({ balasan: `⚠️ Google menolak request.` });
        }

    } catch (error) {
        console.error("Error CS Server:", error);
        return res.status(200).json({ balasan: `⚠️ Backend crash: ${error.message}` });
    }
}
