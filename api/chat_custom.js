const { createClient } = require('@supabase/supabase-js');

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

/* ================= STORAGE: konstanta dipakai bareng sama /api/storage.js ================= */
const STORAGE_QUOTA_BYTES = 200 * 1024 * 1024; // 200MB per akun
const STORAGE_BUCKET = 'user-files';

function guessMimeType(fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const map = {
        html: 'text/html', css: 'text/css', js: 'application/javascript',
        json: 'application/json', md: 'text/markdown', txt: 'text/plain',
        svg: 'image/svg+xml', py: 'text/x-python', ts: 'application/typescript'
    };
    return map[ext] || 'text/plain';
}

/* ================= HELPER: KONTEKS PROJECT (Custom Instructions + Knowledge) ================= */
const MAX_PROJECT_CONTEXT_BYTES = 80 * 1024; // ~80KB total isi Knowledge yang di-inject per request

async function getProjectContext(userId, projectId) {
    if (!userId || !projectId) return { instructions: '', knowledgeContext: '' };

    const admin = getSupabaseAdmin();
    if (!admin) return { instructions: '', knowledgeContext: '' };

    const { data: project, error: pErr } = await admin
        .from('user_projects')
        .select('name, custom_instructions')
        .eq('id', projectId)
        .eq('user_id', userId)
        .maybeSingle();

    if (pErr || !project) return { instructions: '', knowledgeContext: '' };

    const instructions = (project.custom_instructions || '').trim();

    const { data: files, error: fErr } = await admin
        .from('user_project_files')
        .select('filename, storage_path')
        .eq('project_id', projectId)
        .eq('user_id', userId);

    if (fErr || !files || files.length === 0) {
        return { instructions, knowledgeContext: '' };
    }

    let totalBytes = 0;
    let adaYangDilewati = false;
    let knowledgeContext = `PROJECT KNOWLEDGE dari Project "${project.name}" (baca dan pakai sebagai konteks/referensi utama buat jawab pertanyaan user di chat ini):\n\n`;

    for (const f of files) {
        const { data: fileBlob, error: dlError } = await admin.storage
            .from(STORAGE_BUCKET)
            .download(f.storage_path);

        if (dlError || !fileBlob) continue;

        const isiFile = await fileBlob.text();
        const ukuran = Buffer.byteLength(isiFile, 'utf8');

        if (totalBytes + ukuran > MAX_PROJECT_CONTEXT_BYTES) {
            adaYangDilewati = true;
            continue;
        }

        totalBytes += ukuran;
        knowledgeContext += `--- File: ${f.filename} ---\n${isiFile}\n\n`;
    }

    if (totalBytes === 0) knowledgeContext = '';
    else if (adaYangDilewati) {
        knowledgeContext += '[Catatan sistem: ada file Knowledge lain di project ini yang dilewati karena kalau digabung kontennya kelewat besar.]\n\n';
    }

    return { instructions, knowledgeContext };
}

/* ================= HANDLER UTAMA ================= */
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    try {
        const {
            pesan, gambarData, gambarType, gambarList, videoFileList, riwayat,
            customProvider, customApiKey, customGeminiModel,
            customOpenRouterKey, customOpenRouterModel, customPrompt,
            thinkMode, deepSearchMode, userId, projectId
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

        // (Instruksi format [PROJECT]/[FILE] otomatis udah dihapus — sekarang Project
        //  cuma dibikin manual sama user lewat menu Projects, bukan otomatis dari sini.)

        // 2.5 KONTEKS PROJECT — kalau chat ini lagi aktif di dalam sebuah Project,
        //     Custom Instructions-nya masuk ke system prompt, dan isi semua file
        //     Knowledge-nya ditempel sebagai konteks sebelum pertanyaan user.
        let pesanEfektif = pesan || '';

        if (projectId) {
            const projectCtx = await getProjectContext(userId, projectId);
            if (projectCtx.instructions) {
                systemPrompt += `\n\nINSTRUKSI KHUSUS PROJECT INI: ${projectCtx.instructions}`;
            }
            if (projectCtx.knowledgeContext) {
                pesanEfektif = projectCtx.knowledgeContext + '---\n\n' + pesanEfektif;
            }
        }

        // 3. DEEP SEARCH (kalau aktif) — hasil pencarian ditempel di depan pesan user
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

        // (Baca-balik-file-by-keyword yang lama udah dihapus dan digantikan konteks
        //  Project Knowledge yang lebih akurat di bagian 2.5 di atas.)

        // 4. SUSUN RIWAYAT + PESAN SESUAI FORMAT PROVIDER
        let draftText;

        if (provider === 'openrouter') {
            const messages = [{ role: 'system', content: systemPrompt }];

            if (Array.isArray(riwayat) && riwayat.length > 0) {
                riwayat.forEach(item => {
                    const roleFormatted = (item.role === 'assistant' || item.role === 'model') ? 'assistant' : 'user';
                    messages.push({ role: roleFormatted, content: item.content || item.text || '' });
                });
            }

            if (daftarGambar.length > 0) {
                const contentParts = [{ type: 'text', text: pesanEfektif }];
                daftarGambar.forEach(img => {
                    const cleanBase64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
                    contentParts.push({ type: 'image_url', image_url: { url: `data:${img.mimeType};base64,${cleanBase64}` } });
                });
                messages.push({ role: 'user', content: contentParts });
            } else {
                messages.push({ role: 'user', content: pesanEfektif });
            }

            try {
                draftText = await callOpenRouter({ key: keyTerpilih, model: modelOpenRouter, messages });
            } catch (err) {
                return res.status(200).json({ balasan: `⚠️ ${err.message}` });
            }
        } else {
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

            const userParts = [{ text: pesanEfektif }];
            daftarGambar.forEach(img => {
                const cleanBase64 = img.data.includes(',') ? img.data.split(',')[1] : img.data;
                userParts.push({ inlineData: { mimeType: img.mimeType, data: cleanBase64 } });
            });
            daftarVideo.forEach(vid => {
                userParts.push({ fileData: { mimeType: vid.mimeType, fileUri: vid.uri } });
            });

            contents.push({ role: 'user', parts: userParts });

            try {
                draftText = await callGemini({ key: keyTerpilih, model: modelGemini, systemPrompt, contents });
            } catch (err) {
                return res.status(200).json({ balasan: `⚠️ ${err.message}` });
            }
        }

        // 5. THINK MODE PASS KE-2: review & perbaiki draft jawaban sendiri sebelum dikirim ke user
        let finalText = draftText;

        if (thinkMode) {
            const refinePrompt = `Ini pertanyaan asli dari user:\n"${pesan}"\n\nIni jawaban draft yang sudah kamu susun:\n"""\n${draftText}\n"""\n\nTinjau ulang draft ini dengan teliti: cek akurasi fakta, kelengkapan, dan kejelasan penjelasannya. Perbaiki kalau ada yang kurang tepat atau kurang lengkap. Balas HANYA dengan versi final yang sudah diperbaiki (jangan tambahkan komentar soal proses reviewnya, jangan bilang "berikut versi revisi", langsung jawaban akhirnya saja).`;

            try {
                if (provider === 'openrouter') {
                    finalText = await callOpenRouter({
                        key: keyTerpilih,
                        model: modelOpenRouter,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: refinePrompt }
                        ]
                    });
                } else {
                    finalText = await callGemini({
                        key: keyTerpilih,
                        model: modelGemini,
                        systemPrompt,
                        contents: [{ role: 'user', parts: [{ text: refinePrompt }] }]
                    });
                }
            } catch (err) {
                console.error('Think Mode: pass review gagal, pakai draft awal:', err);
                finalText = draftText; // fallback aman — tetap kasih jawaban draft kalau review-nya gagal
            }
        }

        return res.status(200).json({
            balasan: finalText,
            deepSearchDitolak: creditDitolak, // null kalau normal/gak pakai deepsearch, string kalau ditolak
            deepSearchSisaKredit: sisaKreditDeepSearch // integer kalau baru dipakai, null kalau tidak
        });

    } catch (error) {
        console.error("Error Custom CS Server:", error);
        return res.status(200).json({ balasan: `⚠️ Backend Custom Mode crash: ${error.message}` });
    }
}
