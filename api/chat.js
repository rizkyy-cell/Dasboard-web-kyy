export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { pesan } = req.body;
        if (!pesan) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Kunci GEMINI_API_KEY belum terpasang di Vercel.' });
        }

        const systemPrompt = "Kamu adalah KYY CS, asisten virtual ramah di Dashboard Web Kyy milik Rizky Kurniawan. Tugasmu memandu user. Info tambahan: Web ini berisi Tools, Mod Aplikasi, dan App Premium. Jika user bertanya cara beli, arahkan untuk klik tombol 'Beli Sekarang' di menu Store.";

        // Model Flash (Harusnya selalu tersedia untuk Free Tier)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

        const response = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: systemPrompt + "\n\nUser bertanya: " + pesan }] }
                ]
            })
        });

        const data = await response.json();

        // BUKA TOPENG: Lempar pesan error mentah dari Google ke layar!
        if (!response.ok) {
            throw new Error(`DEBUG GOOGLE: ${data.error?.message || "Tidak ada pesan spesifik dari Google"}`);
        }

        if (data.candidates && data.candidates.length > 0) {
            const balasanAI = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ balasan: balasanAI });
        } else {
            throw new Error("Format balasan kosong.");
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
