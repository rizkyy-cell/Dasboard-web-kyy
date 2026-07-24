// FUNGSI OTOMATIS BUKA TAB APP MOD DAN AUTO-SCROLL KE KARTU TARGET
async function cekParamUrlShare() {
    const urlParams = new URLSearchParams(window.location.search);
    const appIdTarget = urlParams.get('app_id');

    if (appIdTarget) {
        // 1. Otomatis Pindah ke Tab App Mod (Indeks Navigasi ke-1)
        const navAppModBtn = document.querySelectorAll('.nav-item')[1];
        switchNav('appmod', 1, navAppModBtn);

        // 2. Pastikan Data Aplikasi Supabase Selesai Ditarik & Di-render
        await ambilDataApp();

        // 3. Cari Elemen Kartu Aplikasi Berdasarkan ID Target
        setTimeout(() => {
            const targetCard = document.getElementById(`app-card-${appIdTarget}`);
            if (targetCard) {
                // Geser Layar Mulus Tepat ke Tengah Kartu Aplikasi Target
                targetCard.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });

                // Efek Glowing Sementara (Opsional: Memberikan Highlight Warna Aksen)
                targetCard.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
                targetCard.style.borderColor = 'var(--tg-accent)';
                targetCard.style.boxShadow = '0 0 20px var(--tg-accent)';

                // Hilangkan Efek Glowing Setelah 2.5 Detik
                setTimeout(() => {
                    targetCard.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    targetCard.style.boxShadow = 'none';
                }, 2500);
            }
        }, 350); // Jeda 350ms menunggu animasi slide tab selesai
    }
}
