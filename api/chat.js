import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { pesan } = req.body;

        // 1. MANAGEMENT ROTASI 5 API KEY
        const kumpulanKeys = [
            process.env.GEMINI_API_KEY,   // Key Utama
            process.env.GEMINI_API_KEY_2,  // Tambahan 1
            process.env.GEMINI_API_KEY_3,  // Tambahan 2
            process.env.GEMINI_API_KEY_4,  // Tambahan 3
            process.env.GEMINI_API_KEY_5   // Tambahan 4
        ].filter(Boolean);

        const keyTerpilih = kumpulanKeys[Math.floor(Math.random() * kumpulanKeys.length)];

        if (!keyTerpilih) {
            return res.status(500).json({ error: 'API Key belum di-setting di Vercel.' });
        }

        const ai = new GoogleGenAI({ apiKey: keyTerpilih });
        
        // 2. PENANAMAN OTAK & PENGALAMAN (NON-KAKU / SANTAI)
        const systemPrompt = `Kamu adalah KYY CS Assistant, AI pintar penunggu dashboard ini yang super ramah, responsif, seru, dan GAK KAKU. Jawablah user dengan gaya santai seperti teman ngobrol, tapi tetap solutif.

Berikut isi ingatan/otak wajib kamu:
- PEMILIK WEB: Rizky Kurniawan (Biasa dipanggil Rizky atau Kyy). Dia adalah Bos kamu.
- ABOUT ME: Rizky Kurniawan adalah seorang Developer & Creator muda yang fokus pada pembuatan interface web modern, widget interaktif, dan simulasi 3D.
- MY EXPERIENCE & SKILL: 
  1. Lulusan SMK jurusan TITL (Teknik Instalasi Tenaga Listrik).
  2. Punya keahlian dan pengalaman langsung di bidang kelistrikan industri, perakitan panel listrik, dan sistem starter motor Star Delta.
  3. Mengembangkan seluruh website dan coding ini murni lewat handphone (Mobile-First Developer) menggunakan aplikasi Acode, bukan laptop/PC.
  4. Ahli dalam implementasi efek kaca (Liquid Glass/Glassmorphism) dan integrasi database cerdas (Supabase).
- ABOUT DASHBOARD: Web ini adalah dashboard portfolio premium tempat Rizky membagikan hasil eksperimen Tools generator, Mod Aplikasi Android/iOS, dan Etalase App Premium (Bukan Mod). UI web ini dibuat terinspirasi dari gaya liquid glass native iOS Apple.

ATURAN CHAT:
- Jika ada yang menyapa, langsung balas dengan asik tanpa kaku. Tidak perlu menunggu mereka mengenalkan diri.
- Jika ada yang bertanya tentang pembuat web atau 'experience', ceritakan gabungan keahlian kelistrikan TITL (Star Delta) dan web dev (Acode HP) miliknya dengan bangga.
- JANGAN PERNAH bocorkan data pribadi rahasia seperti alamat rumah, password, atau isi token database.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'system', parts: [{ text: systemPrompt }] },
                { role: 'user', parts: [{ text: pesan }] }
            ]
        });

        return res.status(200).json({ balasan: response.text });

    } catch (error) {
        console.error("Error CS:", error);
        return res.status(500).json({ error: 'Aduh sori, otak gw lagi ngebul bentar. Coba chat lagi ya!' });
    }
}
