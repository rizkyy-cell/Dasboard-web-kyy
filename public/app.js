// STATE MANAGEMENT & SUPABASE INSTANCE
let supabase = null;
let selectedCover = null;
let selectedGallery = new Array(10).fill(null);
let activeGalleryIndex = null;

// ELEMENT REFERENCES
const slugInput = document.getElementById("slugInput");
const slugStatus = document.getElementById("slugStatus");
const slugPreview = document.getElementById("slugPreview");
const coverPreview = document.getElementById("coverPreview");
const coverPlaceholder = document.getElementById("coverPlaceholder");
const galleryGrid = document.getElementById("galleryGrid");
const galleryCounter = document.getElementById("galleryCounter");
const generateBtn = document.getElementById("generateBtn");
const successModal = document.getElementById("successModal");
const resultUrl = document.getElementById("resultUrl");
const copyBtn = document.getElementById("copyBtn");
const openBtn = document.getElementById("openBtn");

// 1. INIT SUPABASE
async function initSupabase() {
  try {
    const res = await fetch("/api/config");
    const config = await res.json();
    if (!config.supabaseUrl || !config.supabaseAnonKey) return;
    supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  } catch (err) {
    console.error("Gagal load config:", err);
  }
}

// 2. RENDER GALLERY GRID
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
      slot.innerHTML = `<span class="text-[10px] text-zinc-500 font-mono">Photo ${index + 1}</span>`;
      slot.onclick = () => {
        activeGalleryIndex = index;
        document.getElementById("galleryInput").click();
      };
    }
    galleryGrid.appendChild(slot);
  });

  galleryCounter.innerText = `${filledCount}/10`;
  checkFormValidity();
}

// 3. SLUG VALIDATION
slugInput.addEventListener("input", async (e) => {
  const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  slugInput.value = val;
  slugPreview.innerText = val || "your-name";

  if (!val) {
    slugStatus.classList.add("hidden");
    checkFormValidity();
    return;
  }
  if (!supabase) return;

  const { data } = await supabase.from("sites").select("slug").eq("slug", val).maybeSingle();
  if (!data) {
    slugStatus.classList.remove("hidden");
    slugStatus.innerText = "Available";
    slugStatus.className = "absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded bg-emerald-950 text-emerald-400 border border-emerald-800";
  } else {
    slugStatus.classList.remove("hidden");
    slugStatus.innerText = "Taken";
    slugStatus.className = "absolute right-3 top-3 text-xs font-semibold px-2 py-1 rounded bg-rose-950 text-rose-400 border border-rose-800";
  }
  checkFormValidity();
});

// 4. GLOBAL FUNCTIONS UNTUK HTML ONCHANGE
window.handleCoverSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedCover = file;
    coverPreview.src = URL.createObjectURL(file);
    coverPreview.classList.remove("hidden");
    coverPlaceholder.classList.add("hidden");
    checkFormValidity();
  }
};

window.handleGallerySelect = (e) => {
  const file = e.target.files[0];
  if (file && activeGalleryIndex !== null) {
    selectedGallery[activeGalleryIndex] = {
      file: file,
      preview: URL.createObjectURL(file)
    };
    activeGalleryIndex = null;
    e.target.value = ""; // Reset input
    renderGalleryGrid();
  }
};

window.removeGalleryImage = (e, index) => {
  e.stopPropagation();
  selectedGallery[index] = null;
  renderGalleryGrid();
};

// 5. BUTTON VALIDATION
function checkFormValidity() {
  const isSlugValid = slugInput.value.trim().length > 0 && slugStatus.innerText === "Available";
  const isGalleryFull = selectedGallery.every(item => item !== null);

  if (isSlugValid && selectedCover && isGalleryFull) {
    generateBtn.disabled = false;
    generateBtn.className = "w-full bg-white hover:bg-zinc-200 text-black font-semibold py-4 rounded-xl text-sm transition-all duration-200 cursor-pointer";
  } else {
    generateBtn.disabled = true;
    generateBtn.className = "w-full bg-zinc-800 text-zinc-500 font-semibold py-4 rounded-xl text-sm transition-all duration-200";
  }
}

// 6. SUBMIT DATA
generateBtn.onclick = async () => {
  if (!supabase) return alert("Supabase error!");
  generateBtn.disabled = true;
  const slug = slugInput.value.trim();

  try {
    generateBtn.innerText = "Uploading cover...";
    const coverPath = `${slug}/cover_${Date.now()}.${selectedCover.name.split('.').pop()}`;
    await supabase.storage.from("uploads").upload(coverPath, selectedCover);
    const coverUrl = supabase.storage.from("uploads").getPublicUrl(coverPath).data.publicUrl;

    const galleryUrls = [];
    for (let i = 0; i < selectedGallery.length; i++) {
      generateBtn.innerText = `Uploading gallery (${i + 1}/10)...`;
      const file = selectedGallery[i].file;
      const path = `${slug}/gallery_${i}_${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from("uploads").upload(path, file);
      galleryUrls.push(supabase.storage.from("uploads").getPublicUrl(path).data.publicUrl);
    }

    generateBtn.innerText = "Saving your website...";
    const { error } = await supabase.from("sites").insert([{ slug, cover_url: coverUrl, gallery_urls: galleryUrls }]);
    if (error) throw error;

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

copyBtn.onclick = () => {
  navigator.clipboard.writeText(resultUrl.innerText);
  copyBtn.innerText = "Copied!";
  setTimeout(() => copyBtn.innerText = "Copy link", 2000);
};

// INIT
initSupabase();
renderGalleryGrid();
