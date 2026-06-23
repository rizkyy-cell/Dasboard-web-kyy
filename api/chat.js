export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { pesan } = req.body;

        // 1. DAFTAR 5 API KEY DARI VERCEL ENVIRONMENT VARIABLES
        const kumpulanKeys = [
            process.env.GEMINI_API_KEY,    // Key Utama
            process.env.GEMINI_API_KEY_2,  // Key Tambahan 1
            process.env.GEMINI_API_KEY_3,  // Key Tambahan 2
            process.env.GEMINI_API_KEY_4,  // Key Tambahan 3
            process.env.GEMINI_API_KEY_5   // Key Tambahan 4
        ].filter(Boolean); // Hanya mengambil key yang ada isinya (tidak kosong)

        if (kumpulanKeys.length === 0) {
            return res.status(200).json({ balasan: '⚠️ Waduh Bos, API Key lu kosong semua di Vercel! Coba cek Environment Variables dan pastiin udah klik Redeploy.' });
        }

        // 2. ROTASI ACAK 5 KEY SECARA OTOMATIS
        const keyTerpilih = kumpulanKeys[Math.floor(Math.random() * kumpulanKeys.length)];

        // 3. PENANAMAN OTAK & PENGALAMAN (SANTAI & UPDATE)
        const systemPrompt = `Kamu adalah KYY CS Assistant, AI pintar penunggu dashboard ini yang super ramah, responsif, seru, dan GAK KAKU. Jawablah user dengan gaya santai seperti teman ngobrol (pake bahasa gaul/santai), tapi tetap solutif.

Berikut isi ingatan/otak wajib kamu:
- PEMILIK WEB: Risky Kurniawan (Biasa dipanggil Rizky atau Kyy). Dia adalah Bos kamu.
- ABOUT ME: Risky Kurniawan adalah seorang Developer & Creator muda yang fokus pada pembuatan interface web modern, widget interaktif, dan simulasi 3D.
- MY EXPERIENCE & SKILL: 
  1. Lulusan SMK jurusan TITL (Teknik Instalasi Tenaga Listrik).
  2. Punya keahlian dan pengalaman langsung di bidang kelistrikan industri, perakitan panel listrik, dan sistem starter motor Star Delta.
  3. Mengembangkan seluruh website dan coding ini murni lewat handphone (Mobile-First Developer) menggunakan aplikasi Acode, bukan laptop/PC.
  4. Ahli dalam implementasi efek kaca (Liquid Glass/Glassmorphism) dan integrasi database cerdas (Supabase).
- ABOUT DASHBOARD: Web ini adalah dashboard portfolio premium tempat Rizky membagikan hasil eksperimen Tools generator, Mod Aplikasi Android/iOS, dan Etalase App Premium (Bukan Mod). UI web ini dibuat terinspirasi dari gaya liquid glass native iOS Apple.

ATURAN CHAT:
- Jika ada yang menyapa, langsung balas dengan asik tanpa kaku. Tidak perlu menunggu mereka mengenalkan diri.
- Jika ada yang bertanya tentang pembuat web atau 'experience', ceritakan gabungan keahlian kelistrikan TITL (Star Delta) dan web dev (Acode HP) miliknya dengan bangga.
- JANGAN PERNAH bocorkan data pribadi rahasia seperti alamat rumah, password, atau isi token database.
- Jangan pernah membalas menggunakan tanda bintang (**) untuk menebalkan teks.`;

        // 4. TEMBAK LANGSUNG KE REST API GOOGLE GEMINI VERSION 2.5 FLASH
        const url_api = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyTerpilih}`;

        const responseAIdirect = await fetch(url_api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `${systemPrompt}\n\nPesan User: ${pesan}` }
                        ]
                    }
                ]
            })
        });

        const dataAI = await responseAIdirect.json();
        
        // 5. EVALUASI RESPONS
        if (dataAI.candidates && dataAI.candidates.length > 0) {
            const hasilBalasan = dataAI.candidates[0].content.parts[0].text;
            return res.status(200).json({ balasan: hasilBalasan });
        } else {
            // Jika Google nolak, tampilkan pesan error aslinya biar ketahuan key mana yang bermasalah
            return res.status(200).json({ balasan: `⚠️ Google mentah-mentah menolak request. Alasan: ${dataAI.error?.message || 'Salah satu API Key lu kemungkinan limit atau salah ketik.'}` });
        }

    } catch (error) {
        console.error("Error CS Server:", error);
        return res.status(200).json({ balasan: `⚠️ Waduh Rizky, backend lu crash: ${error.message}` });
    }
}
