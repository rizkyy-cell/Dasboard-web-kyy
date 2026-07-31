export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { pesan, gambarData, gambarType, riwayat, customApiKey, customPrompt } = req.body;

        // 1. OPSI UTAMA: Gunakan Custom API Key milik user jika diisi di frontend
        let keyTerpilih = customApiKey ? customApiKey.trim() : null;

        // 2. FALLBACK: Jika user tidak mengisi Custom Key, pakai kumpulan API Key Vercel milik Bos Kyy
        if (!keyTerpilih) {
            const kumpulanKeys = [
                process.env.GEMINI_API_KEY,    
                process.env.GEMINI_API_KEY_2,  
                process.env.GEMINI_API_KEY_3,  
                process.env.GEMINI_API_KEY_4,  
                process.env.GEMINI_API_KEY_5   
            ].filter(Boolean);

            if (kumpulanKeys.length === 0) {
                return res.status(200).json({ balasan: '⚠️ Custom API Key belum diisi dan API Key Vercel kosong!' });
            }

            keyTerpilih = kumpulanKeys[Math.floor(Math.random() * kumpulanKeys.length)];
        }

        // 3. SYSTEM PROMPT: Gunakan prompt bawaan user jika diisi, jika kosong pakai default asisten luwes
        const systemPrompt = (customPrompt && customPrompt.trim() !== '') 
            ? customPrompt.trim() 
            : `Kamu adalah Asisten AI kustom yang membantu pengguna secara ramah, cerdas, dan solutif.`;

        // 4. Menyusun memori percakapan
        const contents = [];

        if (Array.isArray(riwayat) && riwayat.length > 0) {
            riwayat.forEach(item => {
                const roleFormatted = (item.role === 'assistant' || item.role === 'model') ? 'model' : 'user';
                contents.push({
                    role: roleFormatted,
                    parts: [{ text: item.content || item.text || '' }]
                });
            });
        }

        // Susun part pesan user yang baru
        const userParts = [{ text: pesan || '' }];
        if (gambarData && gambarType) {
            const cleanBase64 = gambarData.includes(',') ? gambarData.split(',')[1] : gambarData;
            userParts.push({ inlineData: { mimeType: gambarType, data: cleanBase64 } });
        }

        contents.push({
            role: 'user',
            parts: userParts
        });

        // Panggil Gemini API (Menggunakan model stabil 2026)
        const url_api = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${keyTerpilih}`;

        const responseAIdirect = await fetch(url_api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: contents,
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ]
            })
        });

        if (!responseAIdirect.ok) {
            const errorText = await responseAIdirect.text();
            console.error("Detail Eror Custom Mode:", errorText);
            return res.status(200).json({ balasan: `⚠️ API gagal merespons (Status ${responseAIdirect.status}). Periksa Custom API Key kamu.` });
        }

        const dataAI = await responseAIdirect.json();
        
        if (dataAI.candidates && dataAI.candidates.length > 0) {
            const teksBalasan = dataAI.candidates[0].content?.parts?.[0]?.text;
            if (teksBalasan) {
                return res.status(200).json({ balasan: teksBalasan });
            } else {
                return res.status(200).json({ balasan: `⚠️ Respons kosong. Alasan API: ${dataAI.candidates[0].finishReason}` });
            }
        } else {
            return res.status(200).json({ balasan: `⚠️ Perintah ditolak. Alasan: ${dataAI.error?.message || 'Unknown Error'}` });
        }

    } catch (error) {
        console.error("Error Custom CS Server:", error);
        return res.status(200).json({ balasan: `⚠️ Backend Custom Mode crash: ${error.message}` });
    }
                  }

