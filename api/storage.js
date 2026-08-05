const { createClient } = require('@supabase/supabase-js');

// Pakai SERVICE_ROLE key (server-only, bypass RLS) — pola sama kayak chat_custom.js
let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (supabaseAdmin) return supabaseAdmin;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return supabaseAdmin;
}

const STORAGE_BUCKET = 'user-files';
const STORAGE_QUOTA_BYTES = 200 * 1024 * 1024; // 200MB per akun — samain sama chat_custom.js

// PENTING: kita verifikasi identitas user dari accessToken (JWT session Supabase),
// BUKAN percaya begitu saja userId yang dikirim dari client — endpoint ini bisa
// hapus data, jadi harus dipastikan request-nya beneran dari pemilik akun.
async function getVerifiedUserId(admin, accessToken) {
    if (!accessToken) return null;
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data?.user) return null;
    return data.user.id;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak diizinkan' });
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
        return res.status(200).json({ error: 'Storage belum dikonfigurasi di server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum di-set).' });
    }

    const { action, accessToken, projectId, fileId } = req.body;
    const userId = await getVerifiedUserId(admin, accessToken);

    if (!userId) {
        return res.status(200).json({ error: 'Sesi login kamu nggak valid, coba login ulang.' });
    }

    try {
        if (action === 'list') {
            const { data: projects, error: pErr } = await admin
                .from('user_projects')
                .select('id, name, created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            if (pErr) throw pErr;

            const { data: files, error: fErr } = await admin
                .from('user_project_files')
                .select('id, project_id, filename, mime_type, size_bytes, created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false });
            if (fErr) throw fErr;

            const totalBytes = (files || []).reduce((sum, f) => sum + (f.size_bytes || 0), 0);

            return res.status(200).json({
                projects: projects || [],
                files: files || [],
                totalBytes,
                quotaBytes: STORAGE_QUOTA_BYTES
            });
        }

        if (action === 'get_file') {
            const { data: file, error: fErr } = await admin
                .from('user_project_files')
                .select('*')
                .eq('id', fileId)
                .eq('user_id', userId)
                .single();
            if (fErr || !file) return res.status(200).json({ error: 'File nggak ditemukan.' });

            const { data: downloaded, error: dErr } = await admin.storage
                .from(STORAGE_BUCKET)
                .download(file.storage_path);
            if (dErr) return res.status(200).json({ error: 'Gagal ambil isi file dari storage.' });

            const content = await downloaded.text();
            return res.status(200).json({ file, content });
        }

        if (action === 'delete_file') {
            const { data: file, error: fErr } = await admin
                .from('user_project_files')
                .select('storage_path')
                .eq('id', fileId)
                .eq('user_id', userId)
                .single();
            if (fErr || !file) return res.status(200).json({ error: 'File nggak ditemukan.' });

            await admin.storage.from(STORAGE_BUCKET).remove([file.storage_path]);
            await admin.from('user_project_files').delete().eq('id', fileId).eq('user_id', userId);

            return res.status(200).json({ success: true });
        }

        if (action === 'delete_project') {
            const { data: files } = await admin
                .from('user_project_files')
                .select('storage_path')
                .eq('project_id', projectId)
                .eq('user_id', userId);

            if (files && files.length > 0) {
                await admin.storage.from(STORAGE_BUCKET).remove(files.map(f => f.storage_path));
            }
            // Hapus row project — file di tabel ikut kehapus otomatis lewat ON DELETE CASCADE,
            // tapi kita hapus eksplisit juga di sini biar aman walau cascade-nya belum aktif.
            await admin.from('user_project_files').delete().eq('project_id', projectId).eq('user_id', userId);
            await admin.from('user_projects').delete().eq('id', projectId).eq('user_id', userId);

            return res.status(200).json({ success: true });
        }

        return res.status(200).json({ error: 'Action tidak dikenal: ' + action });

    } catch (err) {
        console.error('Storage API error:', err);
        return res.status(200).json({ error: `Storage error: ${err.message}` });
    }
};
