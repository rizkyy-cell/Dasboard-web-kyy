const { createClient } = require('@supabase/supabase-js');

// Pola sama kayak storage.js — verifikasi user dari accessToken, bukan percaya
// begitu saja userId dari client.
let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (supabaseAdmin) return supabaseAdmin;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return supabaseAdmin;
}

async function getVerifiedUserId(admin, accessToken) {
    if (!accessToken) return null;
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user.id;
}

// Model kecil & murah khusus buat judul — JANGAN pakai model utama chat,
// biar nggak boros kuota/biaya tiap sesi baru dibikin.
const TITLE_MODEL = 'gemini-3.1-flash-lite';

function buildFallbackTitle(userText) {
    const clean = (userText || '').trim();
    if (!clean) return 'Chat baru';
    return clean.length > 40 ? clean.slice(0, 40) + '…' : clean;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    const { accessToken, sessionId, userText, aiText } = req.body;
    const fallbackTitle = buildFallbackTitle(userText);

    if (!process.env.GEMINI_API_KEY) {
        // Nggak fatal — biarin judul tetap pakai fallback (potongan teks),
        // daripada bikin seluruh request chat gagal gara-gara ini.
        return res.status(200).json({ title: fallbackTitle, usedFallback: true });
    }

    const admin = getSupabaseAdmin();
    const userId = admin ? await getVerifiedUserId(admin, accessToken) : null;

    try {
        const prompt = `Buatkan SATU judul chat yang singkat (maksimal 6 kata) dalam Bahasa Indonesia berdasarkan potongan percakapan berikut. Judul harus mencerminkan topik/konteks utama, BUKAN menyalin kalimat pertama secara mentah. Jangan pakai tanda kutip, jangan pakai titik di akhir, jangan kasih penjelasan tambahan — balas HANYA dengan judulnya saja.

Pesan user: "${(userText || '').slice(0, 500)}"
Balasan AI: "${(aiText || '').slice(0, 500)}"`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${TITLE_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.4, maxOutputTokens: 30 }
                })
            }
        );

        if (!geminiRes.ok) throw new Error(`Gemini status ${geminiRes.status}`);
        const data = await geminiRes.json();
        let title = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // Bersihin kalau model masih ngasih tanda kutip / titik di akhir
        title = title.replace(/^["'“”]+|["'“”]+$/g, '').replace(/[.。]+$/, '').trim();
        if (title.length > 60) title = title.slice(0, 60) + '…';
        if (!title) title = fallbackTitle;

        // Update langsung ke chat_sessions kalau sessionId & user valid, biar
        // client nggak perlu tahu detail tabel — cukup terima title-nya balik.
        if (admin && userId && sessionId) {
            await admin.from('chat_sessions')
                .update({ title })
                .eq('id', sessionId)
                .eq('user_id', userId);
        }

        return res.status(200).json({ title });
    } catch (err) {
        console.warn('Gagal generate judul chat via Gemini:', err.message);
        return res.status(200).json({ title: fallbackTitle, usedFallback: true });
    }
};
