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
const STORAGE_QUOTA_BYTES = 200 * 1024 * 1024; // 200MB per akun

function guessMimeType(fileName) {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    const map = {
        html: 'text/html', css: 'text/css', js: 'application/javascript',
        json: 'application/json', md: 'text/markdown', txt: 'text/plain',
        svg: 'image/svg+xml', py: 'text/x-python', ts: 'application/typescript',
        csv: 'text/csv'
    };
    return map[ext] || 'text/plain';
}

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
        if (action === 'create_project') {
            const { projectName } = req.body;
            if (!projectName || !projectName.trim()) {
                return res.status(200).json({ error: 'Nama project nggak boleh kosong.' });
            }

            const { data: existing } = await admin
                .from('user_projects')
                .select('id')
                .eq('user_id', userId)
                .eq('name', projectName.trim())
                .maybeSingle();

            if (existing) {
                return res.status(200).json({ error: `Project "${projectName.trim()}" udah ada.` });
            }

            const { data: newProject, error: insErr } = await admin
                .from('user_projects')
                .insert({ user_id: userId, name: projectName.trim() })
                .select()
                .single();

            if (insErr) throw insErr;

            return res.status(200).json({ project: newProject });
        }

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

        if (action === 'get_project_detail') {
            const { data: project, error: pErr } = await admin
                .from('user_projects')
                .select('id, name, custom_instructions, created_at')
                .eq('id', projectId)
                .eq('user_id', userId)
                .single();
            if (pErr || !project) return res.status(200).json({ error: 'Project nggak ditemukan.' });

            const { data: files, error: fErr } = await admin
                .from('user_project_files')
                .select('id, filename, mime_type, size_bytes, created_at')
                .eq('project_id', projectId)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (fErr) throw fErr;

            return res.status(200).json({ project, files: files || [] });
        }

        if (action === 'update_project_instructions') {
            const { instructions } = req.body;
            const { error: upErr } = await admin
                .from('user_projects')
                .update({ custom_instructions: instructions || '', updated_at: new Date() })
                .eq('id', projectId)
                .eq('user_id', userId);
            if (upErr) throw upErr;

            return res.status(200).json({ success: true });
        }

        if (action === 'upload_knowledge_file') {
            const { filename, content } = req.body;
            if (!filename || typeof content !== 'string') {
                return res.status(200).json({ error: 'Nama file / isi file nggak lengkap.' });
            }

            const { data: project, error: pErr } = await admin
                .from('user_projects')
                .select('id')
                .eq('id', projectId)
                .eq('user_id', userId)
                .maybeSingle();
            if (pErr || !project) return res.status(200).json({ error: 'Project nggak ditemukan.' });

            const sizeBytes = Buffer.byteLength(content, 'utf8');

            const { data: sudahDipakai, error: quotaErr } = await admin.rpc('get_storage_usage', { p_user_id: userId });
            if (quotaErr) return res.status(200).json({ error: 'Gagal mengecek quota storage.' });

            if ((sudahDipakai || 0) + sizeBytes > STORAGE_QUOTA_BYTES) {
                const sisaMB = ((STORAGE_QUOTA_BYTES - (sudahDipakai || 0)) / (1024 * 1024)).toFixed(1);
                return res.status(200).json({ error: `Storage penuh (sisa ${sisaMB}MB dari 200MB). Hapus file lama dulu.` });
            }

            const mimeType = guessMimeType(filename);
            const storagePath = `${userId}/${projectId}/${filename}`;

            const { error: uploadErr } = await admin.storage
                .from(STORAGE_BUCKET)
                .upload(storagePath, content, { contentType: mimeType, upsert: true });
            if (uploadErr) return res.status(200).json({ error: 'Gagal upload file: ' + uploadErr.message });

            const { error: rowErr } = await admin.from('user_project_files').upsert({
                user_id: userId,
                project_id: projectId,
                filename,
                storage_path: storagePath,
                mime_type: mimeType,
                size_bytes: sizeBytes,
                updated_at: new Date()
            }, { onConflict: 'project_id,filename' });
            if (rowErr) return res.status(200).json({ error: 'Gagal simpan info file: ' + rowErr.message });

            return res.status(200).json({ success: true });
        }

        return res.status(200).json({ error: 'Action tidak dikenal: ' + action });

    } catch (err) {
        console.error('Storage API error:', err);
        return res.status(200).json({ error: `Storage error: ${err.message}` });
    }
};
