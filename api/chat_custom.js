import { createClient } from '@supabase/supabase-js';

// Pakai SERVICE_ROLE key (bukan anon key) — cuma ada di server, bypass RLS,
// biar backend bisa kurangi/cek credit user tanpa lewat client.
// Dibuat LAZY (bukan langsung dieksekusi di top-level) supaya kalau env var
// belum di-set di Vercel, yang error cuma pas Deep Search dipakai —
// bukan bikin SELURUH backend (termasuk Gemini/OpenRouter) ikut crash.
let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (supabaseAdmin) return supabaseAdmin;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return null;
    }
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return supabaseAdmin;
}

/* ================= HELPER: PANGGIL LLM (Gemini / OpenRouter) ================= */
async function callGemini({ key, model, systemPrompt, contents }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
            ]
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Gemini gagal (Status ${res.status}). Periksa Custom API Key / nama model kamu.`);
    }

    const data = await res.json();
    if (data.candidates && data.candidates.length > 0) {
        const text = data.candidates[0].content?.parts?.[0]?.text;
        if (text) return text;
        throw new Error(`Respons kosong dari Gemini. Alasan: ${data.candidates[0].finishReason}`);
    }
    throw new Error(data.error?.message || 'Perintah ditolak oleh Gemini (Unknown Error)');
}

async function callOpenRouter({ key, model, messages }) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://dashboard.vercel.app',
            'X-Title': 'JRxREZKYY Assistant'
        },
        body: JSON.stringify({ model, messages })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API OpenRouter gagal (Status ${res.status}). Periksa Custom OpenRouter Key / nama model kamu.`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (text) return text;
    throw new Error(`Respons kosong dari OpenRouter. Alasan: ${data.choices?.[0]?.finish_reason || data.error?.message || 'Unknown Error'}`);
}

/* ================= HELPER: DEEP SEARCH (pencarian internet beneran via Serper.dev) ================= */
async function performDeepSearch(query) {
    const serperKey = process.env.SERPER_API_KEY;
    if (!serperKey) {
        return '[CATATAN SISTEM: Mode Deep Search aktif, tapi SERPER_API_KEY belum di-set di Environment Variables Vercel — pencarian internet DILEWATI. Beri tahu user soal ini secara jujur di jawabanmu, jangan berpura-pura sudah mencari.]\n\n';
    }

    try {
        const res = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query, num: 6 })
        });

        if (!res.ok) throw new Error('Status ' + res.status);
        const data = await res.json();
        const organic = data.organic || [];

        if (organic.length === 0) {
            return '[Pencarian internet dijalankan tapi tidak menemukan hasil relevan untuk query ini.]\n\n';
        }

        let formatted = 'HASIL PENCARIAN INTERNET TERBARU (pakai ini sebagai referensi utama untuk menjawab, dan sebutkan sumbernya di jawaban):\n\n';

        if (data.answerBox) {
            formatted += `Ringkasan langsung: ${data.answerBox.answer || data.answerBox.snippet || ''}\n\n`;
        }

        organic.slice(0, 6).forEach((item, i) => {
            let namaDomain = item.link;
            try { namaDomain = new URL(item.link).hostname.replace(/^www\./, ''); } catch(e) {}
            formatted += `${i + 1}. ${item.title}\n${item.snippet || ''}\nSumber: [${namaDomain}](${item.link})\n\n`;
        });

        formatted += 'PENTING: saat kamu sebutkan sumber di jawabanmu, tulis dalam format markdown link seperti [nama-domain](url) di atas — JANGAN cuma nulis nama sumbernya sebagai teks polos, biar bisa diklik user.\n\n';

        return formatted;
    } catch (err) {
        console.error('Deep Search gagal:', err);
        return `[CATATAN SISTEM: Pencarian internet gagal dijalankan (${err.message}). Jawab pakai pengetahuan sendiri, dan beri tahu user kalau pencarian gagal — jangan berpura-pura berhasil.]\n\n`;
    }
}

/* ================= HELPER: CEK & KURANGI CREDIT DEEP SEARCH ================= */
// return { boleh: true, sisa: <integer> }  -> lanjut search, credit sudah dikurangi 1
// return { boleh: false, alasan: '...' }   -> tolak, JANGAN panggil Serper
async function pakaiCreditDeepSearch(userId) {
    if (!userId) {
        return { boleh: false, alasan: 'Kamu harus login dulu buat pakai Deep Search.' };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
        console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set di Environment Variables Vercel.');
        return { boleh: false, alasan: 'Fitur Deep Search belum dikonfigurasi di server.' };
    }

    const { data, error } = await admin.rpc('consume_deepsearch_credit', {
        p_user_id: userId
    });

    if (error) {
        console.error('Gagal cek credit deepsearch:', error);
        return { boleh: false, alasan: 'Gagal mengecek kredit Deep Search, coba lagi.' };
    }

    if (data === null) {
        return { boleh: false, alasan: 'Kredit Deep Search kamu sudah habis. Upgrade VIP untuk menambah kuota.' };
    }

    return { boleh: true, sisa: data };
}

/* ================= HELPER: SIMPAN FILE HASIL GENERATE AI KE STORAGE PERMANEN ================= */
const STORAGE_QUOTA_BYTES = 200 * 1024 * 1024; // 200MB per akun
const STORAGE_BUCKET = 'user-files';

// Cari marker [PROJECT: ...] dan [FILE: nama] diikuti blok kode ```lang ... ```
// yang sengaja diinstruksiin ke AI lewat system prompt. Marker ini yang jadi sinyal
// "file ini harus disimpan permanen", bukan sekadar potongan kode biasa di jawaban.
function parseFilesFromResponse(text) {
    const projectMatch = text.match(/\[PROJECT:\s*(.+?)\]/);
    const projectName = projectMatch ? projectMatch[1].trim() : null;

    const files = [];
    const fileRegex = /\[FILE:\s*(.+?)\]\s*```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g;
    let m;
    while ((m = fileRegex.exec(text)) !== null) {
        files.push({ fileName: m[1].trim(), content: m[2] });
    }

    return { projectName, files };
}

// Hapus baris marker [PROJECT: ...] / [FILE: ...] dari teks yang ditampilkan ke user —
// blok kodenya (``` ```) TETAP ada, jadi tetap muncul normal sebagai artifact card di chat.
function stripFileMarkers(text) {
    return text
        .replace(/\[PROJECT:\s*.+?\]\s*\n?/g, '')
        .replace(/\[FILE:\s*.+?\]\s*\n?/g, '');
}

function guessMimeType(fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const map = {
        html: 'text/html', css: 'text/css', js: 'application/javascript',
        json: 'application/json', md: 'text/markdown', txt: 'text/plain',
        svg: 'image/svg+xml', py: 'text/x-python', ts: 'application/typescript'
    };
    return map[ext] || 'text/plain';
}

// return { tersimpan: true, projectName, files: [...] }
//     atau { tersimpan: false, alasan: '...' }  -> JANGAN upload apapun
async function simpanFileKeStorage(userId, projectName, files) {
    if (!userId) {
        return { tersimpan: false, alasan: 'User belum login, file nggak bisa disimpan permanen.' };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
        return { tersimpan: false, alasan: 'Storage belum dikonfigurasi di server.' };
    }

    const totalBytesBaru = files.reduce((sum, f) => sum + Buffer.byteLength(f.content, 'utf8'), 0);

    const { data: sudahDipakai, error: cekError } = await admin.rpc('get_storage_usage', { p_user_id: userId });
    if (cekError) {
        console.error('Gagal cek quota storage:', cekError);
        return { tersimpan: false, alasan: 'Gagal mengecek quota storage.' };
    }

    if ((sudahDipakai || 0) + totalBytesBaru > STORAGE_QUOTA_BYTES) {
        const sisaMB = ((STORAGE_QUOTA_BYTES - (sudahDipakai || 0)) / (1024 * 1024)).toFixed(1);
        return { tersimpan: false, alasan: `Storage penuh (sisa ${sisaMB}MB dari 200MB). Hapus file lama dulu sebelum bikin yang baru.` };
    }

    const namaProject = (projectName && projectName.trim()) || `Project ${new Date().toLocaleDateString('id-ID')}`;

    // cari project dengan nama sama milik user ini, atau bikin baru
    let projectId;
    const { data: existingProject } = await admin
        .from('user_projects')
        .select('id')
        .eq('user_id', userId)
        .eq('name', namaProject)
        .maybeSingle();

    if (existingProject) {
        projectId = existingProject.id;
        await admin.from('user_projects').update({ updated_at: new Date() }).eq('id', projectId);
    } else {
        const { data: newProject, error: projErr } = await admin
            .from('user_projects')
            .insert({ user_id: userId, name: namaProject })
            .select('id')
            .single();
        if (projErr) return { tersimpan: false, alasan: 'Gagal bikin project baru: ' + projErr.message };
        projectId = newProject.id;
    }

    const savedFiles = [];
    for (const f of files) {
        const mimeType = guessMimeType(f.fileName);
        const sizeBytes = Buffer.byteLength(f.content, 'utf8');
        const storagePath = `${userId}/${projectId}/${f.fileName}`;

        const { error: uploadErr } = await admin.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, f.content, { contentType: mimeType, upsert: true });

        if (uploadErr) {
            console.error(`Gagal upload file ${f.fileName}:`, uploadErr);
            continue;
        }

        await admin.from('user_project_files').upsert({
            user_id: userId,
            project_id: projectId,
            filename: f.fileName,
            storage_path: storagePath,
            mime_type: mimeType,
            size_bytes: sizeBytes,
            updated_at: new Date()
        }, { onConflict: 'project_id,filename' });

        savedFiles.push(f.fileName);
    }

    return { tersimpan: true, projectName: namaProject, files: savedFiles };
}

/* ================= HELPER: BACA BALIK FILE TERSIMPAN YANG RELEVAN ================= */
// Cocokin nama file/project yang disebut di pesan user (case-insensitive substring match),
// lalu download isi file yang match dari Storage buat ditempel jadi konteks. Dibatasi ukuran
// total biar nggak boros token kalau user punya banyak file tersimpan.
const MAX_FILE_CONTEXT_BYTES = 60 * 1024; // ~60KB total konten file yang di-inject per request

async function cariDanBacaFileRelevan(userId, pesanText) {
    if (!userId || !pesanText || !pesanText.trim()) return '';

    const admin = getSupabaseAdmin();
    if (!admin) return '';

    const { data: daftarFile, error } = await admin
        .from('user_project_files')
        .select('filename, storage_path, user_projects(name)')
        .eq('user_id', userId);

    if (error || !daftarFile || daftarFile.length === 0) return '';

    const pesanLower = pesanText.toLowerCase();
    const matched = daftarFile.filter(f => {
        const namaProject = f.user_projects?.name || '';
        const namaFileTanpaExt = f.filename.replace(/\.[^.]+$/, '');
        return pesanLower.includes(f.filename.toLowerCase())
            || (namaFileTanpaExt.length > 2 && pesanLower.includes(namaFileTanpaExt.toLowerCase()))
            || (namaProject && namaProject.length > 2 && pesanLower.includes(namaProject.toLowerCase()));
    });

    if (matched.length === 0) return '';

    let totalBytes = 0;
    let adaYangDilewati = false;
    let hasilKonteks = 'FILE TERSIMPAN MILIK USER YANG RELEVAN DENGAN PERTANYAAN INI (baca dan pakai sebagai konteks/referensi langsung, JANGAN bilang kamu tidak punya akses ke file ini — kamu BISA baca isinya di bawah):\n\n';

    for (const f of matched) {
        const { data: fileBlob, error: dlError } = await admin.storage
            .from(STORAGE_BUCKET)
            .download(f.storage_path);

        if (dlError || !fileBlob) continue;

        const isiFile = await fileBlob.text();
        const ukuran = Buffer.byteLength(isiFile, 'utf8');

        if (totalBytes + ukuran > MAX_FILE_CONTEXT_BYTES) {
            adaYangDilewati = true;
            continue;
        }

        totalBytes += ukuran;
        const namaProject = f.user_projects?.name || '(tanpa nama)';
        hasilKonteks += `--- File: ${f.filename} (Project: ${namaProject}) ---\n${isiFile}\n\n`;
    }

    if (totalBytes === 0) return '';

    if (adaYangDilewati) {
        hasilKonteks += '[Catatan sistem: ada file relevan lain yang dilewati karena kontennya kalau digabung kelewat besar buat disertakan sekaligus.]\n\n';
    }

    return hasilKonteks;
}

/* ================= HANDLER UTAMA ================= */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const {
            pesan, gambarData, gambarType, gambarList, videoFileList, riwayat,
            customProvider, customApiKey, customGeminiModel,
            customOpenRouterKey, customOpenRouterModel, customPrompt,
            thinkMode, deepSearchMode, userId
        } = req.body;

        // Normalisasi gambar: gambarList (array, banyak gambar) > gambarData/gambarType tunggal (kompatibel lama)
        const daftarGambar = Array.isArray(gambarList) && gambarList.length > 0
            ? gambarList
            : (gambarData && gambarType ? [{ data: gambarData, mimeType: gambarType }] : []);

        // Video: dikirim sebagai URI hasil upload ke Gemini File API (BUKAN base64 mentah —
        // itu bakal kena limit 4.5MB body request Vercel). Cuma Gemini yang bisa pakai URI ini.
        const daftarVideo = Array.isArray(videoFileList) ? videoFileList : [];

        // 1. TENTUKAN PROVIDER
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

        const modelGemini = (customGeminiModel && customGeminiModel.trim() !== '')
            ? customGeminiModel.trim()
            : (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite');

        const modelOpenRouter = (customOpenRouterModel && customOpenRouterModel.trim() !== '')
            ? customOpenRouterModel.trim()
            : (process.env.OPENROUTER_MODEL || 'openrouter/auto');

        // 2. SYSTEM PROMPT (+ instruksi Think Mode kalau aktif)
        let systemPrompt = (customPrompt && customPrompt.trim() !== '')
            ? customPrompt.trim()
            : `Kamu adalah Asisten AI kustom yang membantu pengguna secara ramah, cerdas, dan solutif.`;

        if (thinkMode) {
            systemPrompt += `\n\nMODE THINK AKTIF: Sebelum menjawab, analisis pertanyaan user secara mendalam dan terstruktur — pertimbangkan beberapa sudut pandang, cek konsistensi logika dan fakta, baru susun jawaban akhir yang jelas dan akurat.`;
        }

        if (userId) {
            systemPrompt += `\n\nKALAU user minta kamu MEMBUAT FILE KODE (misalnya index.html, style.css, script.js, atau file apapun yang jadi bagian dari sebuah project/aplikasi/website), SELALU tandai setiap blok kode itu dengan format berikut PERSIS, supaya otomatis tersimpan permanen:

[PROJECT: Nama Project Singkat]
[FILE: nama-file.ext]
\`\`\`bahasa
...isi kode lengkap file ini...
\`\`\`

Kalau ada beberapa file dalam satu project (misalnya index.html + style.css + script.js), tulis [PROJECT: ...] SEKALI SAJA di awal, lalu [FILE: ...] buat tiap file yang berbeda. JANGAN pakai format [PROJECT]/[FILE] ini untuk jawaban biasa yang bukan pembuatan file/project — cukup pakai blok kode markdown biasa seperti biasanya.`;
        }

        // 3. DEEP SEARCH (kalau aktif) — hasil pencarian ditempel di depan pesan user
        let pesanEfektif = pesan || '';
        let creditDitolak = null; // dipakai buat kasih tahu user kalau kredit habis/belum login
        let sisaKreditDeepSearch = null; // dikirim balik ke frontend biar tracker langsung update

        if (deepSearchMode) {
            const cekCredit = await pakaiCreditDeepSearch(userId);

            if (cekCredit.boleh) {
                sisaKreditDeepSearch = cekCredit.sisa;
                // credit sudah dikurangi 1 di sisi Supabase, baru sekarang panggil Serper
                const searchContext = await performDeepSearch(pesanEfektif);
                pesanEfektif = searchContext + '---\n\nPertanyaan user: ' + pesanEfektif;
            } else {
                // TIDAK memanggil Serper sama sekali kalau credit habis/gak login
                creditDitolak = cekCredit.alasan;
                pesanEfektif = `[CATATAN SISTEM: Deep Search TIDAK dijalankan — ${cekCredit.alasan} Jawab pertanyaan user seperti biasa tanpa pencarian internet, dan beri tahu secara singkat kalau Deep Search-nya dilewati.]\n\n---\n\nPertanyaan user: ${pesanEfektif}`;
            }
        }

        // 3.5 VIDEO cuma didukung Gemini — kalau provider-nya OpenRouter, video nggak
        //     dilampirkan ke request (kebanyakan model OpenRouter nggak bisa baca video),
        //     tapi AI-nya tetap dikasih tau biar jujur ke user, bukan diam-diam diabaikan.
        if (daftarVideo.length > 0 && provider === 'openrouter') {
            pesanEfektif = `[CATATAN SISTEM: User melampirkan video, tapi provider OpenRouter yang sedang dipakai tidak mendukung pembacaan video. Video TIDAK ikut dibaca. Beri tahu user soal ini di jawabanmu, sarankan pindah ke provider Gemini kalau mau video-nya dianalisis.]\n\n---\n\n${pesanEfektif}`;
        }

        /
