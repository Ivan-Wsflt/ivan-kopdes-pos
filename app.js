/**
 * ===================================================================
 * IVAN KOPDES POS - SISTEM KASIR MINIMARKET MODERN
 * Fitur:
 * 1. Barcode Scanner Kamera (Library html5-qrcode) + Komentar Penjelasan
 * 2. Database Barang Dummy Lengkap (EAN-13 Barcode GS1 Indonesia 899...)
 * 3. Input Manual & Filter Pencarian Cepat
 * 4. Keranjang Belanja Interaktif (+, -, Hapus Item, Subtotal)
 * 5. Kalkulasi Pembayaran & Uang Kembalian Real-time
 * 6. Web Audio API (Sound Beep Scanner & Cash Register Suara Kasir Nyata)
 * 7. Modal & Print Struk Thermal Minimarket
 * ===================================================================
 */

// ===================================================================
// 1. DATABASE PRODUK DUMMY MINIMARKET
// ===================================================================
const PRODUCT_DATABASE = [
  {
    barcode: "8998866200578",
    name: "Indomie Mi Goreng Spesial 85g",
    category: "Makanan",
    price: 3500,
    icon: "fa-bowl-food",
    color: "#e11d48"
  },
  {
    barcode: "8992753111119",
    name: "Air Mineral Aqua 600ml",
    category: "Minuman",
    price: 4000,
    icon: "fa-bottle-water",
    color: "#0284c7"
  },
  {
    barcode: "8991002105436",
    name: "Teh Pucuk Harum Melati 350ml",
    category: "Minuman",
    price: 4500,
    icon: "fa-mug-hot",
    color: "#16a34a"
  },
  {
    barcode: "8992775210014",
    name: "Taro Net Seaweed Snack 65g",
    category: "Snack",
    price: 5500,
    icon: "fa-cookie-bite",
    color: "#ea580c"
  },
  {
    barcode: "8992741912018",
    name: "Kopi Kapal Api Special Mix 10s",
    category: "Minuman",
    price: 13500,
    icon: "fa-mug-saucer",
    color: "#78350f"
  },
  {
    barcode: "8998009010224",
    name: "Ultra Milk Susu UHT Cokelat 250ml",
    category: "Minuman",
    price: 6500,
    icon: "fa-glass-water",
    color: "#854d0e"
  },
  {
    barcode: "8991001101231",
    name: "SilverQueen Chocolate Almond 58g",
    category: "Snack",
    price: 16500,
    icon: "fa-candy-cane",
    color: "#b45309"
  },
  {
    barcode: "8992775110024",
    name: "Chitato Sapi Panggang 68g",
    category: "Snack",
    price: 11500,
    icon: "fa-wheat-awn",
    color: "#dc2626"
  },
  {
    barcode: "8993077110189",
    name: "Pocari Sweat Isotonik Botol 500ml",
    category: "Minuman",
    price: 7500,
    icon: "fa-droplet",
    color: "#2563eb"
  },
  {
    barcode: "8992388102123",
    name: "Mie Sedaap Goreng Kriuk 90g",
    category: "Makanan",
    price: 3300,
    icon: "fa-utensils",
    color: "#d97706"
  },
  {
    barcode: "8992696404453",
    name: "Bear Brand Susu Steril 189ml",
    category: "Minuman",
    price: 10500,
    icon: "fa-shield-halved",
    color: "#0f766e"
  },
  {
    barcode: "8994328100142",
    name: "Sari Roti Sobek Cokelat",
    category: "Makanan",
    price: 9000,
    icon: "fa-bread-slice",
    color: "#c2410c"
  },
  {
    barcode: "8999999052011",
    name: "Pepsodent Pencegah Gigi Berlubang 120g",
    category: "Perawatan",
    price: 8500,
    icon: "fa-tooth",
    color: "#0891b2"
  },
  {
    barcode: "8999999512349",
    name: "Lifebuoy Sabun Cair Total 10 100ml",
    category: "Perawatan",
    price: 5000,
    icon: "fa-pump-soap",
    color: "#be123c"
  }
];

// ===================================================================
// 2. STATE MANAGEMENT APLIKASI
// ===================================================================
const state = {
  cart: [],                  // Daftar item yang dibeli [{ product, qty }]
  invoiceCounter: 1,         // Nomor urut transaksi
  activeCategory: "ALL",     // Kategori filter katalog saat ini
  searchQuery: "",           // Kata kunci pencarian
  cashReceived: 0,           // Nominal uang pembeli
  isScannerActive: false,    // Status aktif kamera scanner
  html5QrScanner: null,      // Instance library scanner
  lastScannedCode: null,     // Kode barcode terakhir
  lastScanTimestamp: 0       // Cooldown untuk menghindari scan ganda
};

// ===================================================================
// 3. SOUND EFFECTS SYNTHESIZER (WEB AUDIO API)
// Efek audio tanpa file eksternal: Beep Kasir Supermarket & Cash Register
// ===================================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Bunyi "BEEP!" tajam khas scanner barcode kasir (Frekuensi tinggi 1800Hz)
function playBeepSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1800, ctx.currentTime);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (err) {
    console.warn("Audio playback not allowed yet", err);
  }
}

// Bunyi "Kaching / Sukses" ketika pembayaran berhasil (Arpeggio nada gembira)
function playSuccessSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + index * 0.06);

      gain.gain.setValueAtTime(0.2, now + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.25);
    });
  } catch (err) {
    console.warn("Audio playback error", err);
  }
}

// Bunyi "Error / Buzzer" bila barcode tidak ditemukan atau uang kurang
function playErrorSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (err) {
    console.warn("Audio playback error", err);
  }
}

// ===================================================================
// 4. FORMATTER RUPIAH & HELPER
// ===================================================================
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
}

function generateInvoiceNumber(counter) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const padNum = String(counter).padStart(3, "0");
  return `TRX-${yyyy}${mm}${dd}-${padNum}`;
}

// ===================================================================
// 5. TOAST NOTIFICATION
// ===================================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  let icon = "fa-info-circle";
  if (type === "success") icon = "fa-circle-check";
  if (type === "error") icon = "fa-triangle-exclamation";
  if (type === "warning") icon = "fa-bell";

  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2600);
}

// ===================================================================
// 6. BARCODE SCANNER INTEGRATION (html5-qrcode)
// ===================================================================

/**
 * PENJELASAN CARA KERJA KAMERA SCANNER:
 * 1. Library Html5Qrcode menggunakan API browser Navigator.mediaDevices.getUserMedia()
 *    untuk meminta akses video stream dari perangkat pengguna (laptop webcam atau kamera HP).
 * 2. Html5Qrcode.getCameras() mendeteksi daftar kamera fisik yang tersedia (depan/belakang/USB webcam).
 * 3. html5QrCode.start() mengaktifkan video feed pada elemen DOM target (#interactiveScanner)
 *    dengan konfigurasi:
 *      - fps (Frames Per Second): 10-15 frame per detik agar hemat baterai/CPU namun responsif.
 *      - qrbox: Membatasi area analisis barcode (bounding box 250x150) agar proses dekoding cepat.
 *      - formatsToSupport: Mendukung EAN_13, CODE_128, QR_CODE, UPC_A, dsb.
 * 4. onScanSuccess callback akan dipanggil segera setelah barcode terdeteksi di dalam kamera.
 *    Kita menambahkan 'cooldown' debounce 1.5 detik agar satu barcode tidak ter-scan berulang-ulang
 *    dalam waktu sekian milidetik saat barcode masih di depan lensa.
 * 5. html5QrCode.stop() mematikan stream kamera untuk menghemat daya ketika kasir mematikannya.
 */

// Inisialisasi daftar kamera yang terpasang pada perangkat
async function initCameraDevices() {
  const cameraSelect = document.getElementById("cameraSelect");
  
  if (typeof Html5Qrcode === "undefined") {
    console.error("Library Html5Qrcode belum termuat!");
    return;
  }

  try {
    const devices = await Html5Qrcode.getCameras();
    cameraSelect.innerHTML = "";

    if (devices && devices.length > 0) {
      devices.forEach((device, idx) => {
        const option = document.createElement("option");
        option.value = device.id;
        option.text = device.label || `Kamera ${idx + 1}`;
        cameraSelect.appendChild(option);
      });
      cameraSelect.disabled = false;
    } else {
      cameraSelect.innerHTML = `<option value="">Tidak ada kamera</option>`;
      cameraSelect.disabled = true;
    }
  } catch (err) {
    console.warn("Gagal mendapatkan izin list kamera awal:", err);
    cameraSelect.innerHTML = `<option value="">Kamera Default</option>`;
    cameraSelect.disabled = false;
  }
}

// Fungsi Toggle Nyalakan / Matikan Scanner Kamera
async function toggleCameraScanner() {
  const btn = document.getElementById("btnToggleCamera");
  const btnText = document.getElementById("btnCameraText");
  const placeholder = document.getElementById("scannerPlaceholder");
  const overlay = document.getElementById("scannerOverlay");
  const cameraSelect = document.getElementById("cameraSelect");

  // Jika scanner sedang aktif, maka STOP kamera
  if (state.isScannerActive) {
    try {
      if (state.html5QrScanner) {
        await state.html5QrScanner.stop();
        state.html5QrScanner.clear();
      }
    } catch (e) {
      console.warn("Error saat mematikan kamera:", e);
    }
    state.isScannerActive = false;
    btn.classList.remove("btn-outline-danger");
    btn.classList.add("btn-primary");
    btnText.textContent = "Buka Kamera";
    placeholder.classList.remove("hidden");
    overlay.classList.add("hidden");
    showToast("Kamera scanner dimatikan", "info");
    return;
  }

  // Jika scanner belum aktif, maka START kamera
  try {
    btn.disabled = true;
    btnText.textContent = "Menghubungkan...";

    if (!state.html5QrScanner) {
      // Inisialisasi objek scanner pada container ID "interactiveScanner"
      state.html5QrScanner = new Html5Qrcode("interactiveScanner", {
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
    }

    // Tentukan kamera ID yang dipilih di dropdown atau default environment (belakang)
    const cameraId = cameraSelect.value || { facingMode: "environment" };

    // Konfigurasi frame scanner
    const config = {
      fps: 15, // Frekuensi scan per detik
      qrbox: { width: 260, height: 160 }, // Area kotak target pemindaian barcode
      aspectRatio: 1.777778
    };

    placeholder.classList.add("hidden");

    // Mulai streaming kamera & mendengarkan barcode
    await state.html5QrScanner.start(
      cameraId,
      config,
      onBarcodeScanSuccess, // Dipanggil saat ada barcode yang terbaca
      onBarcodeScanFailure  // Dipanggil tiap frame jika belum ada barcode
    );

    state.isScannerActive = true;
    btn.disabled = false;
    btn.classList.remove("btn-primary");
    btn.classList.add("btn-outline-danger");
    btnText.textContent = "Tutup Kamera";
    overlay.classList.remove("hidden");
    showToast("Kamera siap! Arahkan barcode ke kotak pemindai", "success");

  } catch (err) {
    console.error("Gagal memulai kamera scanner:", err);
    state.isScannerActive = false;
    btn.disabled = false;
    btnText.textContent = "Buka Kamera";
    placeholder.classList.remove("hidden");
    overlay.classList.add("hidden");

    showToast("Gagal mengakses kamera. Periksa izin kamera browser Anda!", "error");
    playErrorSound();
  }
}

/**
 * Callback saat Barcode Berhasil Terbaca oleh Kamera
 * @param {string} decodedText - Teks hasil pembacaan barcode (contoh: '8998866200578')
 * @param {object} decodedResult - Objek meta hasil scan
 */
function onBarcodeScanSuccess(decodedText, decodedResult) {
  const now = Date.now();

  // Debounce Cooldown: Cegah scan berulang dari barcode yang sama dalam jeda 1.5 detik
  if (state.lastScannedCode === decodedText && now - state.lastScanTimestamp < 1500) {
    return;
  }

  state.lastScannedCode = decodedText;
  state.lastScanTimestamp = now;

  console.log("Barcode berhasil di-scan kamera:", decodedText, decodedResult);

  // Proses barcode ke keranjang belanja
  handleBarcodeProcessed(decodedText);
}

// Callback internal saat frame video belum menemukan barcode (diabaikan agar log bersih)
function onBarcodeScanFailure(error) {
  // Biarkan kosong, ini dipanggil setiap frame bila belum ada barcode di kamera
}

// ===================================================================
// 7. PEMROSESAN BARCODE & LOGIKA KERANJANG
// ===================================================================

/**
 * Memproses string barcode: Mencari ke database, bunyi beep, dan tambah ke keranjang
 * @param {string} barcodeCode 
 */
function handleBarcodeProcessed(barcodeCode) {
  const cleanCode = barcodeCode.trim();
  if (!cleanCode) return;

  // Update banner indikator scan terakhir
  const lastScanBanner = document.getElementById("lastScanBanner");
  lastScanBanner.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses barcode: <strong>${cleanCode}</strong>`;

  // Cari di database produk
  const product = PRODUCT_DATABASE.find(item => item.barcode === cleanCode);

  if (product) {
    // 1. Mainkan suara BEEP kasir
    playBeepSound();

    // 2. Tambah ke keranjang belanja
    addToCart(product);

    // 3. Tampilkan notifikasi & update banner
    lastScanBanner.className = "last-scan-banner success";
    lastScanBanner.innerHTML = `<i class="fa-solid fa-check-circle"></i> Berhasil di-scan: <strong>${product.name}</strong> (${formatRupiah(product.price)})`;

    showToast(`Ditambahkan: ${product.name}`, "success");
  } else {
    // Barcode tidak terdaftar di database
    playErrorSound();
    lastScanBanner.className = "last-scan-banner";
    lastScanBanner.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:var(--danger)"></i> Barcode tidak dikenali: <strong>${cleanCode}</strong>`;

    showToast(`Produk dengan barcode '${cleanCode}' tidak ditemukan!`, "error");
  }

  // Kosongkan input manual bila ada isinya
  const manualInput = document.getElementById("manualBarcodeInput");
  manualInput.value = "";
  document.getElementById("btnClearManualInput").classList.add("hidden");
  manualInput.focus();
}

/**
 * Menambahkan item ke keranjang belanja atau menambah Qty jika sudah ada
 * @param {object} product 
 */
function addToCart(product) {
  const existingItem = state.cart.find(item => item.product.barcode === product.barcode);

  if (existingItem) {
    existingItem.qty += 1;
    existingItem.justUpdated = true;
  } else {
    state.cart.push({
      product: product,
      qty: 1,
      justUpdated: true
    });
  }

  renderCart();
  calculatePayment();

  // Reset highlight flash sesaat setelah ditambahkan
  setTimeout(() => {
    const item = state.cart.find(i => i.product.barcode === product.barcode);
    if (item) item.justUpdated = false;
  }, 1200);
}

/**
 * Mengubah jumlah quantity item
 * @param {string} barcode 
 * @param {number} delta (+1 atau -1)
 */
function updateItemQty(barcode, delta) {
  const itemIndex = state.cart.findIndex(i => i.product.barcode === barcode);
  if (itemIndex === -1) return;

  const currentItem = state.cart[itemIndex];
  const newQty = currentItem.qty + delta;

  if (newQty <= 0) {
    // Jika 0, hapus dari keranjang
    removeItemFromCart(barcode);
  } else {
    currentItem.qty = newQty;
    playBeepSound();
    renderCart();
    calculatePayment();
  }
}

/**
 * Menghapus item dari keranjang belanja
 * @param {string} barcode 
 */
function removeItemFromCart(barcode) {
  const item = state.cart.find(i => i.product.barcode === barcode);
  if (!item) return;

  state.cart = state.cart.filter(i => i.product.barcode !== barcode);
  showToast(`Item '${item.product.name}' dihapus`, "info");
  renderCart();
  calculatePayment();
}

/**
 * Mengosongkan seluruh keranjang belanja
 */
function clearCart() {
  if (state.cart.length === 0) return;

  if (confirm("Apakah Anda yakin ingin membatalkan dan mengosongkan seluruh keranjang belanja?")) {
    state.cart = [];
    state.cashReceived = 0;
    document.getElementById("cashReceivedInput").value = "";
    renderCart();
    calculatePayment();
    showToast("Keranjang belanja dikosongkan", "warning");
  }
}

// ===================================================================
// 8. RENDER TAMPILAN KERANJANG (STRUK KANAN)
// ===================================================================
function renderCart() {
  const tableBody = document.getElementById("cartTableBody");
  const emptyState = document.getElementById("emptyCartState");
  const totalItemQty = document.getElementById("totalItemQty");
  const subtotalText = document.getElementById("cartSubtotalText");
  const grandTotalText = document.getElementById("cartGrandTotalText");
  const btnProcess = document.getElementById("btnProcessPayment");

  // Jika keranjang kosong
  if (state.cart.length === 0) {
    tableBody.innerHTML = "";
    emptyState.classList.remove("hidden");
    totalItemQty.textContent = "0 barang";
    subtotalText.textContent = "Rp 0";
    grandTotalText.textContent = "Rp 0";
    btnProcess.disabled = true;

    const btnQris = document.getElementById("btnOpenQrisModal");
    if (btnQris) btnQris.disabled = true;

    const qrisTotalAmount = document.getElementById("qrisTotalAmount");
    if (qrisTotalAmount) qrisTotalAmount.textContent = "Rp 0";
    return;
  }

  emptyState.classList.add("hidden");

  let totalQty = 0;
  let grandTotal = 0;
  let rowsHtml = "";

  state.cart.forEach(item => {
    const subtotal = item.qty * item.product.price;
    totalQty += item.qty;
    grandTotal += subtotal;

    rowsHtml += `
      <tr class="cart-item-row ${item.justUpdated ? 'just-added' : ''}" data-barcode="${item.product.barcode}">
        <td>
          <div class="cart-item-title">${item.product.name}</div>
          <div class="cart-item-meta">@ ${formatRupiah(item.product.price)}</div>
        </td>
        <td>
          <div class="qty-stepper">
            <button type="button" class="btn-qty" onclick="updateItemQty('${item.product.barcode}', -1)" title="Kurang">-</button>
            <span class="qty-number">${item.qty}</span>
            <button type="button" class="btn-qty" onclick="updateItemQty('${item.product.barcode}', 1)" title="Tambah">+</button>
          </div>
        </td>
        <td class="item-subtotal">
          ${formatRupiah(subtotal)}
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-item-delete" onclick="removeItemFromCart('${item.product.barcode}')" title="Hapus item">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = rowsHtml;
  totalItemQty.textContent = `${totalQty} barang`;
  subtotalText.textContent = formatRupiah(grandTotal);
  grandTotalText.textContent = formatRupiah(grandTotal);

  // Aktifkan tombol QRIS dan update nominal di modal QRIS secara real-time
  const btnQris = document.getElementById("btnOpenQrisModal");
  if (btnQris) btnQris.disabled = false;

  const qrisTotalAmount = document.getElementById("qrisTotalAmount");
  if (qrisTotalAmount) qrisTotalAmount.textContent = formatRupiah(grandTotal);
}

// ===================================================================
// 9. KALKULASI PEMBAYARAN & UANG KEMBALIAN
// ===================================================================
function getCartGrandTotal() {
  return state.cart.reduce((sum, item) => sum + (item.qty * item.product.price), 0);
}

function calculatePayment() {
  const grandTotal = getCartGrandTotal();
  const cashInput = document.getElementById("cashReceivedInput");
  const changeDisplay = document.getElementById("changeAmountText");
  const btnProcess = document.getElementById("btnProcessPayment");

  const cashVal = parseFloat(cashInput.value) || 0;
  state.cashReceived = cashVal;

  if (state.cart.length === 0 || grandTotal === 0) {
    changeDisplay.textContent = "Rp 0";
    changeDisplay.className = "change-amount";
    btnProcess.disabled = true;
    return;
  }

  const change = cashVal - grandTotal;

  if (cashVal === 0) {
    changeDisplay.textContent = "Rp 0";
    changeDisplay.className = "change-amount";
    btnProcess.disabled = true;
  } else if (change >= 0) {
    // Uang Pas atau Ada Kembalian
    changeDisplay.textContent = formatRupiah(change);
    changeDisplay.className = "change-amount positive";
    btnProcess.disabled = false;
  } else {
    // Uang Kurang
    const kekurangan = Math.abs(change);
    changeDisplay.textContent = `Kurang ${formatRupiah(kekurangan)}`;
    changeDisplay.className = "change-amount negative";
    btnProcess.disabled = true;
  }
}

// Handler Tombol Cepat Pecahan Uang (Uang Pas, 10k, 20k, 50k, 100k)
function setupQuickCashButtons() {
  const quickButtons = document.querySelectorAll(".btn-cash-quick");
  const cashInput = document.getElementById("cashReceivedInput");

  quickButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const grandTotal = getCartGrandTotal();
      if (grandTotal === 0) {
        showToast("Tambahkan barang ke keranjang terlebih dahulu!", "warning");
        return;
      }

      const amountType = btn.getAttribute("data-amount");

      if (amountType === "exact") {
        cashInput.value = grandTotal;
      } else {
        const nominal = parseInt(amountType, 10);
        cashInput.value = nominal;
      }

      calculatePayment();
    });
  });

  cashInput.addEventListener("input", calculatePayment);
}

// ===================================================================
// 10. RENDER KATALOG PRODUK & FILTER
// ===================================================================
function renderCatalog() {
  const productGrid = document.getElementById("productGrid");
  const countBadge = document.getElementById("productCountBadge");

  // Filter berdasarkan kategori dan query pencarian
  const filtered = PRODUCT_DATABASE.filter(product => {
    const matchCategory = state.activeCategory === "ALL" || product.category === state.activeCategory;
    const matchQuery = product.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                       product.barcode.includes(state.searchQuery);
    return matchCategory && matchQuery;
  });

  countBadge.textContent = `${filtered.length} Item`;

  if (filtered.length === 0) {
    productGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--text-light);">
        <i class="fa-solid fa-box-open" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
        <p>Tidak ada produk yang cocok dengan pencarian.</p>
      </div>
    `;
    return;
  }

  let html = "";
  filtered.forEach(prod => {
    html += `
      <div class="product-card" onclick="handleBarcodeProcessed('${prod.barcode}')" title="Klik untuk simulasi scan barcode: ${prod.barcode}">
        <span class="product-badge-cat">${prod.category}</span>
        <div class="product-img-box" style="color: ${prod.color};">
          <i class="fa-solid ${prod.icon}"></i>
        </div>
        <div class="product-name">${prod.name}</div>
        <div class="product-barcode">
          <i class="fa-solid fa-barcode"></i> ${prod.barcode}
        </div>
        <div class="product-card-bottom">
          <span class="product-price">${formatRupiah(prod.price)}</span>
          <button type="button" class="btn-add-quick" title="Tambah ke keranjang">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    `;
  });

  productGrid.innerHTML = html;
}

// Setup Event Filter Kategori & Input Pencarian
function setupCatalogEvents() {
  const categoryTabs = document.querySelectorAll(".cat-pill");
  const searchInput = document.getElementById("searchProductInput");

  categoryTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      categoryTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.activeCategory = tab.getAttribute("data-category");
      renderCatalog();
    });
  });

  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.trim();
    renderCatalog();
  });
}

// ===================================================================
// 11. FORM INPUT MANUAL & SCANNER USB
// ===================================================================
function setupManualInputEvents() {
  const form = document.getElementById("barcodeInputForm");
  const input = document.getElementById("manualBarcodeInput");
  const btnClear = document.getElementById("btnClearManualInput");

  input.addEventListener("input", () => {
    if (input.value.trim().length > 0) {
      btnClear.classList.remove("hidden");
    } else {
      btnClear.classList.add("hidden");
    }
  });

  btnClear.addEventListener("click", () => {
    input.value = "";
    btnClear.classList.add("hidden");
    input.focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const barcode = input.value.trim();
    if (barcode) {
      handleBarcodeProcessed(barcode);
    }
  });
}

// ===================================================================
// 12. PROSES PEMBAYARAN, MODAL STRUK & CETAK (PRINT)
// ===================================================================
function setupCheckoutAndReceipt() {
  const btnProcess = document.getElementById("btnProcessPayment");
  const btnClearCart = document.getElementById("btnClearCart");
  const receiptModal = document.getElementById("receiptModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnPrintReceipt = document.getElementById("btnPrintReceipt");
  const btnNewTransaction = document.getElementById("btnNewTransaction");

  // Tombol Bayar Tunai & Buka Struk
  btnProcess.addEventListener("click", () => {
    const grandTotal = getCartGrandTotal();
    const cash = state.cashReceived;

    if (state.cart.length === 0) {
      showToast("Keranjang belanja masih kosong!", "warning");
      return;
    }

    if (cash < grandTotal) {
      playErrorSound();
      showToast("Nominal uang tunai pembeli belum mencukupi!", "error");
      return;
    }

    // Suara Arpeggio Sukses / Cash Register
    playSuccessSound();

    // Isi Konten Struk Kasir Thermal (Metode Tunai)
    populateReceiptData("TUNAI");

    // Tampilkan Modal Struk
    receiptModal.classList.remove("hidden");
    showToast("Transaksi Berhasil!", "success");
  });

  // Tombol Cetak Struk (Mengaktifkan window.print)
  btnPrintReceipt.addEventListener("click", () => {
    window.print();
  });

  // Tutup Modal Struk
  btnCloseModal.addEventListener("click", () => {
    receiptModal.classList.add("hidden");
  });

  // Tombol Transaksi Baru dari Modal Struk
  btnNewTransaction.addEventListener("click", () => {
    receiptModal.classList.add("hidden");
    startNewTransaction();
  });

  // Tombol Reset Keranjang
  btnClearCart.addEventListener("click", clearCart);

  // Inisialisasi Fitur Pembayaran QRIS
  setupQrisPayment();
}

/**
 * ===================================================================
 * 12B. FITUR PEMBAYARAN QRIS & CATATAN INTEGRASI DYNAMIC QRIS
 * ===================================================================
 * 
 * 💡 CATATAN PANDUAN INTEGRASI DYNAMIC QRIS (API PAYMENT GATEWAY SEPERTI MIDTRANS):
 * --------------------------------------------------------------------------------
 * Saat ini aplikasi menggunakan foto statis ("Static QRIS" dari qris.png).
 * Pada Static QRIS, pembeli harus memasukkan nominal rupiah secara manual di HP mereka.
 * 
 * Untuk mengubahnya menjadi "Dynamic QRIS" (di mana nominal belanja otomatis terkunci):
 * 
 * 1. TITIK REQUEST GENERATE QR (Frontend -> Backend):
 *    Di dalam function setupQrisPayment() saat tombol 'Bayar via QRIS' diklik,
 *    ganti pemanggilan gambar statis dengan request HTTP POST ke endpoint server backend Anda:
 *    
 *    const response = await fetch('/api/create-qris', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({
 *        order_id: generateInvoiceNumber(state.invoiceCounter),
 *        gross_amount: getCartGrandTotal(),
 *        items: state.cart.map(item => ({
 *          id: item.product.barcode,
 *          name: item.product.name,
 *          price: item.product.price,
 *          quantity: item.qty
 *        }))
 *      })
 *    });
 *    const qrisData = await response.json();
 * 
 * 2. BACKEND INTEGRATION (Node.js / Express / Laravel / Python):
 *    Server backend Anda akan memanggil API Midtrans Core API (Charge QRIS):
 *      POST https://api.sandbox.midtrans.com/v2/charge (Sandbox) atau https://api.midtrans.com/v2/charge (Production)
 *      Header:
 *        Authorization: Basic <Base64(SERVER_KEY:)>
 *        Content-Type: application/json
 *      Payload:
 *        {
 *          "payment_type": "qris",
 *          "transaction_details": {
 *            "order_id": order_id,
 *            "gross_amount": gross_amount
 *          },
 *          "qris": {
 *            "acquirer": "gopay" // Mendukung semua e-wallet & mobile banking via QRIS
 *          }
 *        }
 * 
 * 3. MENAMPILKAN DYNAMIC QRCODE KE USER:
 *    Midtrans akan mengembalikan response JSON yang berisi:
 *      - actions[0].url -> URL gambar QR Code PNG yang sudah di-generate Midtrans
 *      - qr_string -> String EMVCo QRIS (bisa di-render via library frontend qrcode.js)
 *    
 *    Di frontend, cukup pasang URL tersebut:
 *      document.getElementById('qrisImage').src = qrisData.actions[0].url;
 * 
 * 4. REAL-TIME STATUS CHECKING (Menggantikan simulasi 3 detik saat ini):
 *    Gunakan salah satu dari dua pendekatan:
 *    A. Polling Berkala:
 *       Setiap 2-3 detik, frontend memanggil endpoint backend `GET /api/status-qris/:order_id`
 *       (yang meneruskan ke Midtrans: GET https://api.midtrans.com/v2/:order_id/status).
 *       Jika response `transaction_status === "settlement"`, otomatis jalankan checkout sukses!
 *    B. Webhook (Rekomendasi Production):
 *       Midtrans mengirim HTTP POST notifikasi ke Webhook URL server Anda ketika dana masuk.
 *       Server Anda kemudian memberi sinyal ke kasir via WebSocket (Socket.io) atau SSE (Server-Sent Events).
 * ===================================================================
 */

function setupQrisPayment() {
  const btnOpenQris = document.getElementById("btnOpenQrisModal");
  const qrisModal = document.getElementById("qrisModal");
  const btnCloseQris = document.getElementById("btnCloseQrisModal");
  const btnCancelQris = document.getElementById("btnCancelQris");
  const btnCheckQris = document.getElementById("btnCheckQrisPayment");
  const btnCheckText = document.getElementById("btnCheckQrisText");
  const qrisLoading = document.getElementById("qrisLoadingStatus");
  const qrisTotalAmount = document.getElementById("qrisTotalAmount");

  // Buka Modal Pembayaran QRIS
  btnOpenQris.addEventListener("click", () => {
    const grandTotal = getCartGrandTotal();
    if (grandTotal === 0) {
      showToast("Keranjang belanja masih kosong!", "warning");
      return;
    }

    // Tampilkan Total Pembayaran secara real-time
    qrisTotalAmount.textContent = formatRupiah(grandTotal);

    // Reset status UI modal
    qrisLoading.classList.add("hidden");
    btnCheckQris.disabled = false;
    btnCancelQris.disabled = false;
    btnCheckText.textContent = "Cek Status Pembayaran";

    // Munculkan Modal QRIS
    qrisModal.classList.remove("hidden");
    playBeepSound();
  });

  // Fungsi Tutup Modal QRIS
  const closeQrisModal = () => {
    qrisModal.classList.add("hidden");
    qrisLoading.classList.add("hidden");
  };

  btnCloseQris.addEventListener("click", closeQrisModal);
  btnCancelQris.addEventListener("click", closeQrisModal);

  // Simulasi Pengecekan Pembayaran (Dummy Simulation)
  btnCheckQris.addEventListener("click", () => {
    const grandTotal = getCartGrandTotal();
    if (grandTotal === 0) return;

    // Kunci tombol aksi saat proses verifikasi berlangsung
    btnCheckQris.disabled = true;
    btnCancelQris.disabled = true;
    btnCheckText.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mengecek Status...`;
    qrisLoading.classList.remove("hidden");
    playBeepSound();

    // Simulasi waktu tunggu verifikasi bank/server selama 3 detik
    setTimeout(() => {
      // 1. Sembunyikan loading dan tutup modal QRIS
      qrisLoading.classList.add("hidden");
      qrisModal.classList.add("hidden");
      btnCheckQris.disabled = false;
      btnCancelQris.disabled = false;
      btnCheckText.textContent = "Cek Status Pembayaran";

      // 2. Mainkan suara sukses kasir
      playSuccessSound();

      // 3. Tampilkan Notifikasi Toast
      showToast("Pembayaran Berhasil! Transaksi QRIS diterima.", "success");

      // 4. Siapkan Data Struk Thermal (Metode QRIS)
      populateReceiptData("QRIS");

      // 5. Tampilkan Modal Struk Kasir
      const receiptModal = document.getElementById("receiptModal");
      receiptModal.classList.remove("hidden");

      // 6. Otomatis Cetak Struk
      window.print();

      // 7. Reset Keranjang Belanja Menjadi Kosong
      startNewTransaction();
    }, 3000);
  });
}

// Mengisi data transaksi ke tampilan struk thermal kertas
function populateReceiptData(paymentMethod = "TUNAI") {
  const grandTotal = getCartGrandTotal();
  let cash = state.cashReceived;
  let change = 0;

  const methodLabel = document.getElementById("recPaymentMethodLabel");
  if (paymentMethod === "QRIS") {
    cash = grandTotal;
    change = 0;
    if (methodLabel) methodLabel.textContent = "QRIS - GOPAY";
  } else {
    change = Math.max(0, cash - grandTotal);
    if (methodLabel) methodLabel.textContent = "TUNAI";
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB";
  const invNumber = generateInvoiceNumber(state.invoiceCounter);

  document.getElementById("recTrxId").textContent = invNumber;
  document.getElementById("recDate").textContent = dateStr;
  document.getElementById("recTime").textContent = timeStr;

  // Render Baris Barang di Struk Thermal
  const receiptTableBody = document.getElementById("receiptTableBody");
  let tableHtml = "";
  let totalQty = 0;

  state.cart.forEach(item => {
    const sub = item.qty * item.product.price;
    totalQty += item.qty;

    tableHtml += `
      <tr>
        <td colspan="2">
          <span class="rec-item-name">${item.product.name}</span>
          <span class="rec-item-sub">${item.qty} x ${formatRupiah(item.product.price)}</span>
        </td>
        <td class="rec-item-price">${formatRupiah(sub)}</td>
      </tr>
    `;
  });

  receiptTableBody.innerHTML = tableHtml;
  document.getElementById("recTotalQty").textContent = totalQty;
  document.getElementById("recGrandTotal").textContent = formatRupiah(grandTotal);
  document.getElementById("recCashAmount").textContent = formatRupiah(cash);
  document.getElementById("recChangeAmount").textContent = formatRupiah(change);

  // Mock Barcode Acak di footer struk
  const randomBarcode = state.cart.length > 0 ? state.cart[0].product.barcode : "8998866200578";
  document.getElementById("recBarcodeFake").textContent = `*${randomBarcode}*`;
}

// Mulai transaksi baru setelah selesai pembayaran
function startNewTransaction() {
  state.cart = [];
  state.cashReceived = 0;
  state.invoiceCounter += 1;

  document.getElementById("invoiceNumber").textContent = generateInvoiceNumber(state.invoiceCounter);
  document.getElementById("cashReceivedInput").value = "";
  
  renderCart();
  calculatePayment();

  // Kembalikan fokus ke input manual
  const manualInput = document.getElementById("manualBarcodeInput");
  manualInput.value = "";
  manualInput.focus();

  showToast("Siap untuk transaksi berikutnya!", "info");
}

// ===================================================================
// 13. JAM DIGITAL REAL-TIME
// ===================================================================
function startLiveClock() {
  const clockEl = document.getElementById("liveClock");
  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }) + " WIB";
    clockEl.textContent = timeStr;
  }
  tick();
  setInterval(tick, 1000);
}

// ===================================================================
// 14. INITIALIZE ON DOM READY
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Tampilkan nomor invoice awal
  document.getElementById("invoiceNumber").textContent = generateInvoiceNumber(state.invoiceCounter);

  // 2. Render Jam Digital
  startLiveClock();

  // 3. Render Katalog Produk
  renderCatalog();
  setupCatalogEvents();

  // 4. Setup Input Manual & Barcode Form
  setupManualInputEvents();

  // 5. Setup Quick Cash & Payment
  setupQuickCashButtons();
  setupCheckoutAndReceipt();

  // 6. Inisialisasi Kamera & Scanner Barcode
  initCameraDevices();
  document.getElementById("btnToggleCamera").addEventListener("click", toggleCameraScanner);

  // 7. Fokus awal ke input barcode
  document.getElementById("manualBarcodeInput").focus();
});
