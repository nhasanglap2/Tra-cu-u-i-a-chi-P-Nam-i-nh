// Nam Định Address Lookup Application Logic

let rawData = null;
let processedAddresses = [];
let filteredAddresses = [];
let loadedIndex = 0;
const PAGE_SIZE = 20;
let searchTimeout = null;

// DOM Elements
const cardsContainer = document.getElementById('cards-container');
const searchInput = document.getElementById('search-input');
const clearBtn = document.getElementById('clear-btn');
const searchCount = document.getElementById('search-count');
const scrollSentinel = document.getElementById('scroll-sentinel');
const emptyState = document.getElementById('empty-state');
const initialLoading = document.getElementById('initial-loading');
const toastContainer = document.getElementById('toast-container');

// Accent removal helper for Vietnamese fuzzy search
function removeDiacritics(str) {
    if (!str) return '';
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

// Convert uppercase/allcaps to title case nicely
function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

// Parse address data into structured format for styling
function parseAddress(item, tdps) {
    let ten = '';
    let dc = '';
    let tdpId = '';
    
    if (item.length === 2) {
        ten = item[0];
        dc = item[0];
        tdpId = item[1];
    } else if (item.length === 3) {
        ten = item[0];
        dc = item[1];
        tdpId = item[2];
    }
    
    // Extract parentheses notes
    let addressToClean = dc || ten || '';
    let note = '';
    const parenMatch = addressToClean.match(/\(([^)]+)\)/);
    if (parenMatch) {
        note = '(' + parenMatch[1].trim() + ')';
        addressToClean = addressToClean.replace(/\([^)]+\)/, '').trim();
    }
    
    const header = addressToClean.toUpperCase();
    const subLines = [];
    
    if (note) {
        subLines.push(note.toUpperCase());
    }
    
    // Lookup TDP info
    const tdpInfo = tdps[tdpId];
    const tdpName = tdpInfo ? tdpInfo.name : tdpId;
    
    // If ten is different from dc
    const cleanTen = ten.trim();
    const cleanDc = dc.trim();
    if (cleanTen && cleanDc && cleanTen.toLowerCase() !== cleanDc.toLowerCase()) {
        let displayTen = cleanTen;
        if (displayTen === displayTen.toUpperCase()) {
            displayTen = toTitleCase(displayTen);
        }
        subLines.push(displayTen);
    }
    
    // Add TDP Name as fallback or additional info
    if (subLines.length === 0) {
        subLines.push(tdpName);
    } else if (note) {
        subLines.push(tdpName);
    }
    
    // Build search keywords for accent-insensitive lookup
    const searchTerms = [
        removeDiacritics(ten),
        removeDiacritics(dc),
        removeDiacritics(tdpName),
        tdpId.toLowerCase()
    ].join(' ');
    
    return {
        header,
        subLines,
        tdpId,
        tdpName,
        tdpInfo,
        searchTerms
    };
}

// Initialize Application
async function init() {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Không thể tải dữ liệu.');
        
        rawData = await response.json();
        
        // Pre-process addresses
        processedAddresses = rawData.addresses.map(item => parseAddress(item, rawData.tdps));
        filteredAddresses = [...processedAddresses];
        
        // Remove initial loading spinner
        if (initialLoading) {
            initialLoading.remove();
        }
        
        // Enable search input
        searchInput.disabled = false;
        searchInput.placeholder = `Tìm kiếm trong ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ...`;
        
        // Initial render
        renderNextPage();
        updateSearchCount();
        
        // Setup Infinite Scroll Observer
        setupInfiniteScroll();
        
    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        cardsContainer.innerHTML = `
            <div class="spinner-container">
                <span class="material-symbols-outlined" style="font-size: 48px; color: var(--primary-red);">error</span>
                <p style="margin-top: 10px; font-weight: 600;">Không thể tải dữ liệu địa chỉ.</p>
                <p style="font-size: 13px; color: var(--text-muted);">Vui lòng kiểm tra lại kết nối hoặc tải lại trang.</p>
            </div>
        `;
    }
}

// Setup Infinite Scroll
function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && loadedIndex < filteredAddresses.length) {
            scrollSentinel.classList.add('loading');
            // Small timeout to simulate smooth loading transitions
            setTimeout(() => {
                renderNextPage();
                scrollSentinel.classList.remove('loading');
            }, 150);
        }
    }, {
        rootMargin: '100px'
    });
    
    observer.observe(scrollSentinel);
}

// Render next batch of cards
function renderNextPage() {
    const nextBatch = filteredAddresses.slice(loadedIndex, loadedIndex + PAGE_SIZE);
    
    if (nextBatch.length === 0 && loadedIndex === 0) {
        emptyState.classList.remove('hidden');
        scrollSentinel.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    scrollSentinel.classList.remove('hidden');
    
    // Hide scroll sentinel if we loaded everything
    if (loadedIndex + nextBatch.length >= filteredAddresses.length) {
        scrollSentinel.classList.add('hidden');
    }
    
    nextBatch.forEach(addr => {
        const card = createCardElement(addr);
        cardsContainer.appendChild(card);
    });
    
    loadedIndex += nextBatch.length;
}

// Create single address card HTML element
function createCardElement(addr) {
    const card = document.createElement('div');
    card.className = 'address-card';
    
    // Header section
    const sublinesHtml = addr.subLines.map((line, idx) => {
        const className = idx === 0 ? 'card-subtitle' : 'card-subtitle-2';
        return `<div class="${className}">${line}</div>`;
    }).join('');
    
    // Officers columns
    const tdp = addr.tdpInfo;
    const cskv = tdp ? tdp.cskv : null;
    const hs = tdp ? tdp.hs : null;
    
    const cskvHtml = createOfficerColumn('CSKV', cskv);
    const hsHtml = createOfficerColumn('Hình sự', hs);
    
    card.innerHTML = `
        <div class="card-header">
            <div class="card-title-row">
                <h2 class="card-title">${addr.header}</h2>
                <span class="tdp-badge">${addr.tdpId}</span>
            </div>
            ${sublinesHtml}
        </div>
        <div class="card-body">
            ${cskvHtml}
            ${hsHtml}
        </div>
    `;
    
    // Add copy event listeners
    setupCopyButtonEvents(card);
    
    return card;
}

// Helper to create Officer Column HTML
function createOfficerColumn(roleName, officer) {
    if (!officer || !officer.name) {
        return `
            <div class="card-col disabled">
                <span class="col-role">${roleName}</span>
                <div class="col-name">Chưa có dữ liệu</div>
                <div class="col-phone">-</div>
                <div class="col-buttons">
                    <button class="btn-card btn-call" disabled>
                        <span class="material-symbols-outlined">call</span> Gọi ngay
                    </button>
                    <button class="btn-card btn-copy" disabled>
                        <span class="material-symbols-outlined">content_copy</span> Sao chép SĐT
                    </button>
                </div>
            </div>
        `;
    }
    
    // Format phone nicely: e.g. 0899636838 -> 0899.636.838
    const phoneFormatted = formatPhoneNumber(officer.phone);
    
    return `
        <div class="card-col ${roleName === 'CSKV' ? 'cskv-col' : 'hs-col'}">
            <span class="col-role">${roleName}</span>
            <div class="col-name">${officer.name}</div>
            <div class="col-phone">${phoneFormatted}</div>
            <div class="col-buttons">
                <a href="tel:${officer.phone}" class="btn-card btn-call">
                    <span class="material-symbols-outlined">call</span> Gọi ngay
                </a>
                <button class="btn-card btn-copy" data-phone="${officer.phone}">
                    <span class="material-symbols-outlined">content_copy</span> Sao chép SĐT
                </button>
            </div>
        </div>
    `;
}

// Format Phone: 0899636838 -> 0899.636.838
function formatPhoneNumber(phone) {
    if (!phone) return '-';
    // Remove non-digit
    const cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 4)}.${cleaned.slice(4, 7)}.${cleaned.slice(7)}`;
    }
    return phone;
}

// Setup Copy Buttons logic
function setupCopyButtonEvents(cardElement) {
    const copyBtns = cardElement.querySelectorAll('.btn-copy:not([disabled])');
    copyBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const phone = btn.getAttribute('data-phone');
            if (phone) {
                navigator.clipboard.writeText(phone).then(() => {
                    showToast(`Đã sao chép SĐT: ${formatPhoneNumber(phone)}`);
                }).catch(err => {
                    console.error('Lỗi copy:', err);
                    // Fallback copy
                    const tempInput = document.createElement('input');
                    tempInput.value = phone;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempInput);
                    showToast(`Đã sao chép SĐT: ${formatPhoneNumber(phone)}`);
                });
            }
        });
    });
}

// Show animated floating Toast success capsule
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-success-icon">check_circle</span>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Animate out and remove
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.25s ease-in forwards';
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, 2000);
}

// Handle search action
function handleSearch(query) {
    const cleanedQuery = removeDiacritics(query);
    
    if (!cleanedQuery) {
        filteredAddresses = [...processedAddresses];
        clearBtn.classList.add('hidden');
    } else {
        clearBtn.classList.remove('hidden');
        // Search queries separated by space must all match (AND query)
        const queryTerms = cleanedQuery.split(/\s+/).filter(t => t.length > 0);
        
        filteredAddresses = processedAddresses.filter(addr => {
            return queryTerms.every(term => addr.searchTerms.includes(term));
        });
    }
    
    // Reset view
    cardsContainer.innerHTML = '';
    loadedIndex = 0;
    renderNextPage();
    updateSearchCount();
}

// Update Search Count Badge
function updateSearchCount() {
    if (!searchInput.value.trim()) {
        searchCount.classList.add('hidden');
        return;
    }
    searchCount.classList.remove('hidden');
    searchCount.textContent = `${filteredAddresses.length.toLocaleString('vi-VN')} kết quả`;
}

// Listeners
searchInput.addEventListener('input', (e) => {
    // Debounce to keep UI responsive
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        handleSearch(e.target.value);
    }, 200);
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch('');
    searchInput.focus();
});

// ============================================================
// UPDATE FEATURE — Password-protected Google Sheets data sync
// ============================================================

const CORRECT_PASSWORD = 'Kingdo110191@';

// Google Sheets CSV export URLs (same spreadsheet, different sheet GIDs)
const SHEET_ID = '1GLdE_YZ7-Q5oHVDyEun3jhZ9PoKtYblh2s9--YB8mxc';
const SHEET_URLS = {
    diaChi:   `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=0`,
    toDanPho: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1862090847`,
    canBo:    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=1719798850`,
};

// UI element refs for the update feature
const updateBtn        = document.getElementById('update-btn');
const passwordModal    = document.getElementById('password-modal');
const passwordInput    = document.getElementById('password-input');
const pwError          = document.getElementById('pw-error');
const modalCancelBtn   = document.getElementById('modal-cancel-btn');
const modalConfirmBtn  = document.getElementById('modal-confirm-btn');
const togglePwBtn      = document.getElementById('toggle-pw-btn');
const togglePwIcon     = document.getElementById('toggle-pw-icon');
const updateOverlay    = document.getElementById('update-overlay');
const updateStatusTitle = document.getElementById('update-status-title');
const updateStatusDesc  = document.getElementById('update-status-desc');

// Open password modal when Update button clicked
updateBtn.addEventListener('click', () => {
    passwordInput.value = '';
    passwordInput.classList.remove('error');
    pwError.classList.add('hidden');
    passwordModal.classList.remove('hidden');
    setTimeout(() => passwordInput.focus(), 100);
});

// Toggle password visibility
togglePwBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePwIcon.textContent = 'visibility_off';
    } else {
        passwordInput.type = 'password';
        togglePwIcon.textContent = 'visibility';
    }
});

// Cancel modal
modalCancelBtn.addEventListener('click', closePasswordModal);
passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) closePasswordModal();
});

// Allow Enter key to confirm
passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') modalConfirmBtn.click();
});

// Confirm — check password and proceed
modalConfirmBtn.addEventListener('click', () => {
    const entered = passwordInput.value;
    if (entered !== CORRECT_PASSWORD) {
        passwordInput.classList.add('error');
        pwError.classList.remove('hidden');
        // Remove shake class to re-trigger animation on next attempt
        setTimeout(() => passwordInput.classList.remove('error'), 400);
        return;
    }
    closePasswordModal();
    startDataUpdate();
});

function closePasswordModal() {
    passwordModal.classList.add('hidden');
    passwordInput.value = '';
    passwordInput.type = 'password';
    togglePwIcon.textContent = 'visibility';
    pwError.classList.add('hidden');
}

// Parse a CSV string into an array of row arrays
function parseCSV(text) {
    const rows = [];
    const lines = text.split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        // Handle quoted fields
        const cols = [];
        let inQuote = false;
        let cur = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuote = !inQuote;
            } else if (ch === ',' && !inQuote) {
                cols.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
        cols.push(cur.trim());
        rows.push(cols);
    }
    return rows;
}

// Main update logic
async function startDataUpdate() {
    // Show spinning icon on update button
    updateBtn.classList.add('spinning');

    // Show progress overlay
    updateOverlay.classList.remove('hidden');
    setUpdateStatus('Đang kết nối Google Sheets...', 'Bước 1/3: Tải danh sách địa chỉ nhà...');

    try {
        // --- Step 1: Fetch Địa chỉ sheet ---
        const diaChiRes = await fetch(SHEET_URLS.diaChi);
        if (!diaChiRes.ok) throw new Error('Không thể tải sheet Địa chỉ nhà.');
        const diaChiCSV = await diaChiRes.text();
        const diaChiRows = parseCSV(diaChiCSV);

        setUpdateStatus('Đang tải dữ liệu...', 'Bước 2/3: Tải danh sách Tổ dân phố...');

        // --- Step 2: Fetch Tổ dân phố sheet ---
        const tdpRes = await fetch(SHEET_URLS.toDanPho);
        if (!tdpRes.ok) throw new Error('Không thể tải sheet Tổ dân phố.');
        const tdpCSV = await tdpRes.text();
        const tdpRows = parseCSV(tdpCSV);

        setUpdateStatus('Đang tải dữ liệu...', 'Bước 3/3: Tải danh sách Cán bộ...');

        // --- Step 3: Fetch Cán bộ sheet ---
        const canBoRes = await fetch(SHEET_URLS.canBo);
        if (!canBoRes.ok) throw new Error('Không thể tải sheet Cán bộ.');
        const canBoCSV = await canBoRes.text();
        const canBoRows = parseCSV(canBoCSV);

        setUpdateStatus('Đang xử lý dữ liệu...', 'Đang ghép thông tin cán bộ với địa chỉ...');

        // --- Build officer map from Cán bộ sheet ---
        // Expected columns: Mã cán bộ, Họ tên, Số điện thoại
        const officerMap = {};
        const canBoHeader = canBoRows[0] || [];
        // Find column indices flexibly
        const cbMaIdx   = canBoHeader.findIndex(h => removeDiacritics(h).includes('ma'));
        const cbTenIdx  = canBoHeader.findIndex(h => removeDiacritics(h).includes('ten') || removeDiacritics(h).includes('ho'));
        const cbSdtIdx  = canBoHeader.findIndex(h => removeDiacritics(h).includes('dien') || removeDiacritics(h).includes('sdt') || removeDiacritics(h).includes('phone'));
        for (let i = 1; i < canBoRows.length; i++) {
            const row = canBoRows[i];
            const ma  = (row[cbMaIdx]  || '').trim();
            const ten = (row[cbTenIdx] || '').trim();
            const sdt = (row[cbSdtIdx] || '').replace(/\D/g, '').trim();
            if (ma && ten) officerMap[ma] = { name: ten, phone: sdt };
        }

        // --- Build TDP map from Tổ dân phố sheet ---
        // Expected: Mã TDP, Tên TDP, Mã CSKV, Mã Hình sự
        const tdpMap = {};
        const tdpHeader = tdpRows[0] || [];
        const tdpMaIdx   = tdpHeader.findIndex(h => removeDiacritics(h).includes('ma') && !removeDiacritics(h).includes('can'));
        const tdpTenIdx  = tdpHeader.findIndex(h => removeDiacritics(h).includes('ten'));
        const tdpCskvIdx = tdpHeader.findIndex(h => removeDiacritics(h).toLowerCase().includes('cskv'));
        const tdpHsIdx   = tdpHeader.findIndex(h => removeDiacritics(h).toLowerCase().includes('hinh su') || removeDiacritics(h).toLowerCase().includes('hs'));
        for (let i = 1; i < tdpRows.length; i++) {
            const row     = tdpRows[i];
            const ma      = (row[tdpMaIdx]   || '').trim();
            const ten     = (row[tdpTenIdx]  || '').trim();
            const maCskv  = (row[tdpCskvIdx] || '').trim();
            const maHs    = (row[tdpHsIdx]   || '').trim();
            if (ma) {
                tdpMap[ma] = {
                    name: ten || ma,
                    cskv: officerMap[maCskv] || null,
                    hs:   officerMap[maHs]   || null,
                };
            }
        }

        // --- Build address list from Địa chỉ sheet ---
        // Expected columns: Địa chỉ trong sổ đỏ, Tên gọi, Mã TDP
        const dcHeader = diaChiRows[0] || [];
        const dcSoDoIdx = dcHeader.findIndex(h => removeDiacritics(h).includes('so do') || removeDiacritics(h).includes('dia chi'));
        const dcTenIdx  = dcHeader.findIndex(h => removeDiacritics(h).includes('ten goi') || removeDiacritics(h).includes('ten'));
        const dcTdpIdx  = dcHeader.findIndex(h => removeDiacritics(h).includes('to dan') || removeDiacritics(h).includes('tdp') || removeDiacritics(h).includes('ma to'));

        const newAddresses = [];
        for (let i = 1; i < diaChiRows.length; i++) {
            const row   = diaChiRows[i];
            const soDo  = (row[dcSoDoIdx] || '').trim();
            const tenGoi = (row[dcTenIdx]  || '').trim();
            const tdpId  = (row[dcTdpIdx]  || '').trim();
            if (!tdpId) continue;
            const displayAddr = soDo || tenGoi;
            if (!displayAddr) continue;
            if (soDo && tenGoi && soDo !== tenGoi) {
                newAddresses.push([tenGoi, soDo, tdpId]);
            } else {
                newAddresses.push([displayAddr, tdpId]);
            }
        }

        // --- Replace runtime data ---
        rawData = { addresses: newAddresses, tdps: tdpMap };
        processedAddresses = rawData.addresses.map(item => parseAddress(item, rawData.tdps));
        filteredAddresses = [...processedAddresses];

        // Re-render
        cardsContainer.innerHTML = '';
        loadedIndex = 0;
        searchInput.value = '';
        searchInput.disabled = false;
        searchInput.placeholder = `Tìm kiếm trong ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ...`;
        renderNextPage();
        updateSearchCount();

        // Done!
        updateOverlay.classList.add('hidden');
        updateBtn.classList.remove('spinning');
        showToast(`✅ Đã cập nhật ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ mới nhất!`);

    } catch (err) {
        console.error('Lỗi cập nhật:', err);
        updateOverlay.classList.add('hidden');
        updateBtn.classList.remove('spinning');
        showToast('❌ Cập nhật thất bại: ' + err.message);
    }
}

function setUpdateStatus(title, desc) {
    updateStatusTitle.textContent = title;
    updateStatusDesc.textContent  = desc;
}

// Run Init
document.addEventListener('DOMContentLoaded', init);

