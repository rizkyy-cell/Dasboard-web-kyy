export default async function handler(req, res) {
    // Hanya izinkan metode POST dari chat box kamu
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { pesan } = req.body;
        if (!pesan) return res.status(400).json({ error: 'Pesan tidak boleh kosong' });

        // Pengecekan Kunci Brankas Vercel
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Kunci GEMINI_API_KEY belum terpasang di environment Vercel.' });
        }

        // Karakter Bot (Bisa kamu sesuaikan sendiri nanti kalimatnya)
        const systemPrompt = "Kamu adalah KYY CS, asisten virtual ramah di Dashboard Web Kyy milik Risky Kurniawan. Jawablah pertanyaan seputar isi dashboard dengan singkat, profesional, dan gunakan bahasa Indonesia yang mudah dipahami.";

        // URL Model Gemini 1.5 Pro 
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;

        // Proses pengiriman data ke Google
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

        // Jika Google menolak, tangkap pesan error aslinya agar tampil di layar
        if (!response.ok) {
            throw new Error(data.error?.message || "Koneksi ditolak oleh server Google Gemini.");
        }

        // Jika sukses, ambil jawaban teksnya dan kirim kembali ke UI Dashboard
        if (data.candidates && data.candidates.length > 0) {
            const balasanAI = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ balasan: balasanAI });
        } else {
            throw new Error("Format balasan dari Gemini kosong atau tidak sesuai.");
        }

    } catch (error) {
        // Tampilkan pesan error ke layar chat untuk debugging
        return res.status(500).json({ error: error.message });
    }
}
