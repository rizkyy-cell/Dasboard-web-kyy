const { createClient } = require('@supabase/supabase-js');

// File ini di-deploy di project PUBLIK (jrxrezkyy-dashboard), bukan project admin,
// karena yang perlu direkam IP-nya adalah user biasa yang login di dashboard publik.
let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (supabaseAdmin) return supabaseAdmin;
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    return supabaseAdmin;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const admin = getSupabaseAdmin();
    if (!admin) {
        // Diamkan saja kalau server belum dikonfigurasi — ini fitur pelengkap,
        // jangan sampai bikin proses login utama user ikut gagal/error.
        return res.status(200).json({ success: false });
    }

    try {
        const { accessToken } = req.body;
        if (!accessToken) return res.status(200).json({ success: false });

        // Verifikasi token sesi user dulu — memastikan yang minta update
        // memang pemilik akun itu sendiri, bukan sembarang orang nebak ID.
        const { data, error } = await admin.auth.getUser(accessToken);
        if (error || !data?.user) return res.status(200).json({ success: false });

        // x-forwarded-for dari Vercel ini yang dipakai (bukan IP yang dikirim client),
        // karena ini datang dari header request asli yang tidak bisa dipalsukan user.
        const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();

        await admin
            .from('user_profiles')
            .update({ last_ip: ip, last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('track-login error:', err);
        return res.status(200).json({ success: false });
    }
};
