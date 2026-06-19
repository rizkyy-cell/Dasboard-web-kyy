export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { pesan } = req.body;
        if (!pesan) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Kunci GEMINI_API_KEY belum terpasang di environment Vercel.' });
        }

        const systemPrompt = "Kamu adalah KYY CS, asisten virtual ramah di Dashboard Web Kyy. Jawablah pertanyaan seputar isi dashboard dengan singkat, profesional, dan gunakan bahasa Indonesia yang mudah dipahami.";

        // URL Model yang sudah diperbarui sesuai Changelog resmi Google (Tanpa -latest)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

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

        if (!response.ok) {
            throw new Error(data.error?.message || "Koneksi ditolak oleh server Google Gemini.");
        }

        if (data.candidates && data.candidates.length > 0) {
            const balasanAI = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ balasan: balasanAI });
        } else {
            throw new Error("Format balasan dari Gemini kosong atau tidak sesuai.");
        }

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
