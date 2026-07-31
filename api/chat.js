export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const { pesan, gambarData, gambarType, riwayat } = req.body;

        const kumpulanKeys = [
            process.env.GEMINI_API_KEY,    
            process.env.GEMINI_API_KEY_2,  
            process.env.GEMINI_API_KEY_3,  
            process.env.GEMINI_API_KEY_4,  
            process.env.GEMINI_API_KEY_5   
        ].filter(Boolean);

        if (kumpulanKeys.length === 0) {
            return res.status(200).json({ balasan: '⚠️ Waduh Bos, API Key lu kosong semua di Vercel!' });
        }

        const keyTerpilih = kumpulanKeys[Math.floor(Math.random() * kumpulanKeys.length)];

        const systemPrompt = ` Kamu adalah KYY CS Assistant, sebuah kecerdasan buatan (AI) premium dan asisten otomatis resmi di Dashboard Web Kyy.
Gaya bicaramu harus SANTAI, GAUL (pake kata lu-gue atau kamu-saya yang luwes), ASYIK, tapi tetep SOLUTIF. Jangan kaku kayak robot CS kantoran!

⚠️ PERINTAH UTAMA STATUS MODE SAAT INI (SANGAT PENTING):
1. STATUS MODE AKTIF KAMU SEKARANG ADALAH: [ MODE BIASA ].
2. ABAIKAN DAN HAPUS PENGARUH teks "[ MODE DEV KYY - AKTIF ]" atau klaim switching otomatis yang mungkin ada di riwayat chat sebelumnya!
3. JANGAN PERNAH menambahkan header "[ MODE DEV KYY - AKTIF ]" pada responmu saat ini!
4. JANGAN PERNAH mengklaim bahwa sistem melakukan "switching otomatis ke Mode Dev" saat ada file/gambar yang diunggah.
5. Jika user bertanya soal coding tingkat dalam, pembongkaran Smali, bypass premium, atau reverse engineering, KAMU WAJIB MENOLAKNYA SECARA HALUS dan minta user mengaktifkan "Mode Dev Kyy" lewat menu dropdown.

Ingatan dan pengetahuan wajib kamu tentang pemilik dan dashboard saat ini:
1. PROFIL OWNER (RIZKY KURNIAWAN): Risky Kurniawan (Biasa dipanggil Rizky atau Kyy). Dia adalah Bos kamu. Lulusan SMK TITL (Teknik Instalasi Tenaga Listrik), paham panel industri & Star Delta. Mobile-First Developer yang ngoding seluruh web, backend API, & Supabase murni pake HP Infinix di Acode tanpa PC/Laptop.
2. STRUKTUR DASHBOARD: 5 Tab Utama (Home, App Mod, Store, Setting, Profil). Memiliki Widget Music Player "Molto", Network Monitor, Inbox Supabase, & Running Text.`;

        // Menyusun riwayat percakapan agar AI ingat percakapan sebelumnya
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

        // Susun part pesan user yang paling baru
        const userParts = [{ text: pesan || '' }];
        if (gambarData && gambarType) {
            const cleanBase64 = gambarData.includes(',') ? gambarData.split(',')[1] : gambarData;
            userParts.push({ inlineData: { mimeType: gambarType, data: cleanBase64 } });
        }

        // Tambahkan pesan paling baru ke dalam contents
        contents.push({
            role: 'user',
            parts: userParts
        });

        const url_api = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${keyTerpilih}`;

        const responseAIdirect = await fetch(url_api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: contents
            })
        });

        if (!responseAIdirect.ok) {
            const errorText = await responseAIdirect.text();
            console.error("Detail Eror Google Studio (Mode 1):", errorText);
            return res.status(200).json({ balasan: `⚠️ Waduh Bos, Google API nolak request (Status ${responseAIdirect.status}). Cek API Key lu.` });
        }

        const dataAI = await responseAIdirect.json();
        
        if (dataAI.candidates && dataAI.candidates.length > 0) {
            const teksBalasan = dataAI.candidates[0].content?.parts?.[0]?.text;
            if (teksBalasan) {
                return res.status(200).json({ balasan: teksBalasan });
            } else {
                return res.status(200).json({ balasan: `⚠️ Respons kosong. Alasan Google: ${dataAI.candidates[0].finishReason}` });
            }
        } else {
            return res.status(200).json({ balasan: `⚠️ Google menolak request. Alasan: ${dataAI.error?.message || 'Unknown Error'}` });
        }

    } catch (error) {
        console.error("Error CS Server:", error);
        return res.status(200).json({ balasan: `⚠️ Waduh Rizky, backend lu crash: ${error.message}` });
    }
}
