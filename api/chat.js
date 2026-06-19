export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { pesan } = req.body;
        if (!pesan) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

        // Pengecekan Kunci Vercel
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Kunci GEMINI_API_KEY belum terpasang di Vercel.' });
        }

        const systemPrompt = "Kamu adalah KYY CS, asisten virtual ramah di Dashboard Web Kyy milik Risky Kurniawan. Jawablah dengan singkat, profesional, dan gunakan bahasa Indonesia.";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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

        // Tangkap langsung pesan error asli dari mesin Google
        if (!response.ok) {
            throw new Error(data.error?.message || "Ditolak oleh server Google Gemini.");
        }

        if (data.candidates && data.candidates.length > 0) {
            const balasanAI = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ balasan: balasanAI });
        } else {
            throw new Error("Format balasan dari Gemini tidak sesuai.");
        }

    } catch (error) {
        // Tampilkan pesan error aslinya ke layar chat
        return res.status(500).json({ error: error.message });
    }
}
