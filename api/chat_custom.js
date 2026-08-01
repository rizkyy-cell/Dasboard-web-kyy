export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const {
            pesan, gambarData, gambarType, riwayat,
            customProvider, customApiKey, customGeminiModel,
            customOpenRouterKey, customOpenRouterModel, customPrompt
        } = req.body;

        // 1. TENTUKAN PROVIDER: pakai pilihan eksplisit dari toggle di frontend.
        //    Kalau field-nya nggak ada (request lama/luar app), fallback ke tebakan berbasis key yang tersedia.
        const openrouterKey = customOpenRouterKey ? customOpenRouterKey.trim() : null;
        const geminiKeyUser = customApiKey ? customApiKey.trim() : null;

        let provider = customProvider === 'openrouter' || customProvider === 'gemini'
            ? customProvider
            : (openrouterKey ? 'openrouter' : 'gemini');

        let keyTerpilih = null;

        if (provider === 'openrouter') {
            if (!openrouterKey) {
                return res.status(200).json({ balasan: '⚠️ Provider OpenRouter dipilih tapi Custom API Key (OpenRouter) belum diisi!' });
            }
            keyTerpilih = openrouterKey;
        } else {
            if (geminiKeyUser) {
                keyTerpilih = geminiKeyUser;
            } else {
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
        }

        // 2. SYSTEM PROMPT: Gunakan prompt bawaan user jika diisi, jika kosong pakai default asisten luwes
        const systemPrompt = (customPrompt && customPrompt.trim() !== '')
            ? customPrompt.trim()
            : `Kamu adalah Asisten AI kustom yang membantu pengguna secara ramah, cerdas, dan solutif.`;

        // ================= JALUR OPENROUTER =================
        if (provider === 'openrouter') {
            const messages = [{ role: 'system', content: systemPrompt }];

            if (Array.isArray(riwayat) && riwayat.length > 0) {
                riwayat.forEach(item => {
                    const roleFormatted = (item.role === 'assistant' || item.role === 'model') ? 'assistant' : 'user';
                    messages.push({ role: roleFormatted, content: item.content || item.text || '' });
                });
            }

            if (gambarData && gambarType) {
                const cleanBase64 = gambarData.includes(',') ? gambarData.split(',')[1] : gambarData;
                messages.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: pesan || '' },
                        { type: 'image_url', image_url: { url: `data:${gambarType};base64,${cleanBase64}` } }
                    ]
                });
            } else {
                messages.push({ role: 'user', content: pesan || '' });
            }

            // Prioritas model: model yang diisi user di kolom "Model (OpenRouter)" >
            // Environment Variable OPENROUTER_MODEL di Vercel > "openrouter/auto"
            // ("openrouter/auto" itu fitur resmi OpenRouter buat milih model terbaik otomatis).
            const modelOpenRouter = (customOpenRouterModel && customOpenRouterModel.trim() !== '')
                ? customOpenRouterModel.trim()
                : (process.env.OPENROUTER_MODEL || 'openrouter/auto');

            const responseOR = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${keyTerpilih}`,
                    // OpenRouter minta header ini buat identifikasi aplikasi (opsional tapi disarankan)
                    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://dashboard.vercel.app',
                    'X-Title': 'JRxREZKYY Assistant'
                },
                body: JSON.stringify({
                    model: modelOpenRouter,
                    messages: messages
                })
            });

            if (!responseOR.ok) {
                const errorText = await responseOR.text();
                console.error('Detail Eror OpenRouter:', errorText);
                return res.status(200).json({ balasan: `⚠️ OpenRouter gagal merespons (Status ${responseOR.status}). Periksa Custom OpenRouter Key / nama model kamu.` });
            }

            const dataOR = await responseOR.json();

            const teksBalasanOR = dataOR.choices?.[0]?.message?.content;
            if (teksBalasanOR) {
                return res.status(200).json({ balasan: teksBalasanOR });
            } else {
                const finishReason = dataOR.choices?.[0]?.finish_reason;
                return res.status(200).json({ balasan: `⚠️ Respons kosong dari OpenRouter. Alasan: ${finishReason || dataOR.error?.message || 'Unknown Error'}` });
            }
        }

        // ================= JALUR GEMINI (sama seperti sebelumnya) =================
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

        const userParts = [{ text: pesan || '' }];
        if (gambarData && gambarType) {
            const cleanBase64 = gambarData.includes(',') ? gambarData.split(',')[1] : gambarData;
            userParts.push({ inlineData: { mimeType: gambarType, data: cleanBase64 } });
        }

        contents.push({
            role: 'user',
            parts: userParts
        });

        // Prioritas model: model yang diisi user di kolom "Model (Gemini)" >
        // Environment Variable GEMINI_MODEL di Vercel > default gemini-3.1-flash-lite
        const modelGemini = (customGeminiModel && customGeminiModel.trim() !== '')
            ? customGeminiModel.trim()
            : (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite');

        const url_api = `https://generativelanguage.googleapis.com/v1beta/models/${modelGemini}:generateContent?key=${keyTerpilih}`;

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
