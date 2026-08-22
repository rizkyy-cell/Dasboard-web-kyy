// STATE MANAGEMENT & SUPABASE INSTANCE
let supabase = null;
let selectedCover = null;
let selectedGallery = new Array(10).fill(null);
let isSlugAvailable = false;
let activeGalleryIndex = null;

// ELEMENT REFERENCES
const slugInput = document.getElementById("slugInput");
const slugStatus = document.getElementById("slugStatus");
const slugPreview = document.getElementById("slugPreview");
const coverBox = document.getElementById("coverBox");
const coverInput = document.getElementById("coverInput");
const coverPreview = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");
const galleryGrid = document.getElementById("galleryGrid");
const galleryInput = document.getElementById("galleryInput");
const galleryCounter = document.getElementById("galleryCounter");
const generateBtn = document.getElementById("generateBtn");
const successModal = document.getElementById("successModal");
const resultUrl = document.getElementById("resultUrl");
const copyBtn = document.getElementById("copyBtn");
const openBtn = document.getElementById("openBtn");

// 1. INIT SUPABASE FROM VERCEL ENV API
async function initSupabase() {
  try {
    const res = await fetch("/api/config");
    const config = await res.json();
    
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      console.error("Environment Variables Vercel belum diset!");
      return;
    }

    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  } catch (err) {
    console.error("Gagal mengambil konfigurasi dari /api/config:", err);
  }
}

// 2. INITIALIZE GALLERY GRID
function renderGalleryGrid() {
  galleryGrid.innerHTML = "";
  let filledCount = 0;

  selectedGallery.forEach((item, index) => {
    if (item) filledCount++;
    const slot = document.createElement("div");
    slot.className = "relative aspect-square bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col justify-center items-center cursor-pointer group";

    if (item) {
      slot.innerHTML = `
        <img src="${item.preview}" class="w-full h-full object-cover">
        <button onclick="removeGalleryImage(event, ${index})" class="absolute top-1 right-1 bg-black/60 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs z-10">✕</button>
      `;
    } else {
      slot.innerHTML = `
        <span class="text-[10px] text-zinc-500 font-mono">Photo ${index + 1}</span>
      `;
      slot.onclick = () => {
        activeGalleryIndex = index;
        galleryInput.click();
      };
    }
    galleryGrid.appendChild(slot);
  });

  galleryCounter.innerText = `${filledCount}/10`;
  checkFormValidity();
}

// 3. EVENT LISTENERS - SLUG CHECK
slugInput.addEventListener("input", async (e) => {
  const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  slugInput.value = val;
  slugPreview.innerText = val || "your-name";

  if (!val) {
    slugStatus.classList.add("hidden");
    isSlugAvailable = false;
    checkFormValidity();
    return;
  }

  if (!supabase) return;

  const { data } = await supabase.from("sites").select("slug").eq("slug", val).maybeSingle();

  if (!data) {
    slugStatus.classList.remove("hidden");
    slugStatus.innerText = "Available";
    slugStatus.className = "absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800";
    isSlugAvailable = true;
  } else {
    slugStatus.classList.remove("hidden");
    slugStatus.innerText = "Taken";
    slugStatus.className = "absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800";
    isSlugAvailable = false;
  }
  checkFormValidity();
});

// 4. COVER IMAGE HANDLING
coverBox.onclick = () => coverInput.click();
coverInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedCover = file;
    coverPreview.src = URL.createObjectURL(file);
    coverPreview.classList.remove("hidden");
    coverPlaceholder.classList.add("hidden");
    checkFormValidity();
  }
};

// 5. GALLERY IMAGE HANDLING
galleryInput.onchange = (e) => {
  const file = e.target.files[0];
  if (file && activeGalleryIndex !== null) {
    selectedGallery[activeGalleryIndex] = {
      file: file,
      preview: URL.createObjectURL(file)
    };
    activeGalleryIndex = null;
    galleryInput.value = "";
    renderGalleryGrid();
  }
};

window.removeGalleryImage = (e, index) => {
  e.stopPropagation();
  selectedGallery[index] = null;
  renderGalleryGrid();
};

// 6. VALIDATION & BUTTON STATE
function checkFormValidity() {
  const isGalleryFull = selectedGallery.every(item => item !== null);
  if (isSlugAvailable && selectedCover && isGalleryFull) {
    generateBtn.disabled = false;
    generateBtn.className = "w-full bg-white hover:bg-zinc-200 text-black font-semibold py-4 rounded-xl text-sm transition-all duration-200 cursor-pointer";
  } else {
    generateBtn.disabled = true;
    generateBtn.className = "w-full bg-zinc-800 text-zinc-500 font-semibold py-4 rounded-xl text-sm transition-all duration-200";
  }
}

// 7. UPLOAD & GENERATE PROCESS
generateBtn.onclick = async () => {
  if (!supabase) {
    alert("Supabase belum terkonfigurasi dengan benar di Vercel!");
    return;
  }

  generateBtn.disabled = true;
  const slug = slugInput.value.trim();

  try {
    // Upload Cover
    generateBtn.innerText = "Uploading cover...";
    const coverExt = selectedCover.name.split('.').pop();
    const coverPath = `${slug}/cover_${Date.now()}.${coverExt}`;
    
    const { error: coverErr } = await supabase.storage.from("uploads").upload(coverPath, selectedCover);
    if (coverErr) throw coverErr;

    const coverUrl = supabase.storage.from("uploads").getPublicUrl(coverPath).data.publicUrl;

    // Upload 10 Foto Galeri
    const galleryUrls = [];
    for (let i = 0; i < selectedGallery.length; i++) {
      generateBtn.innerText = `Uploading gallery (${i + 1}/10)...`;
      const file = selectedGallery[i].file;
      const ext = file.name.split('.').pop();
      const path = `${slug}/gallery_${i}_${Date.now()}.${ext}`;

      const { error: galErr } = await supabase.storage.from("uploads").upload(path, file);
      if (galErr) throw galErr;

      const publicUrl = supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl;
      galleryUrls.push(publicUrl);
    }

    // Simpan ke Database
    generateBtn.innerText = "Saving your website...";
    const { error: dbErr } = await supabase.from("sites").insert([{
      slug: slug,
      cover_url: coverUrl,
      gallery_urls: galleryUrls
    }]);

    if (dbErr) throw dbErr;

    // Tampilkan Link Rapi
    const fullUrl = `${window.location.origin}/${slug}`;
    resultUrl.innerText = fullUrl;
    openBtn.href = fullUrl;
    successModal.classList.remove("hidden");

  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    generateBtn.innerText = "Generate website";
    checkFormValidity();
  }
};

// 8. COPY LINK BUTTON
copyBtn.onclick = () => {
  navigator.clipboard.writeText(resultUrl.innerText);
  copyBtn.innerText = "Copied!";
  setTimeout(() => copyBtn.innerText = "Copy link", 2000);
};

// INITIALIZE APP
initSupabase();
renderGalleryGrid();
      
