// Nam Định Address Lookup Application Logic

let rawData = null;
let processedAddresses = [];
let filteredAddresses = [];
let loadedIndex = 0;
const PAGE_SIZE = 20;
let searchTimeout = null;

// DOM Elements
const cardsContainer = document.getElementById('cards-container');
const searchInput    = document.getElementById('search-input');
const clearBtn       = document.getElementById('clear-btn');
const searchCount    = document.getElementById('search-count');
const scrollSentinel = document.getElementById('scroll-sentinel');
const emptyState     = document.getElementById('empty-state');
const initialLoading = document.getElementById('initial-loading');
const toastContainer = document.getElementById('toast-container');

// ─── Helpers ────────────────────────────────────────────────

// Bỏ dấu tiếng Việt để tìm kiếm không dấu
function removeDiacritics(str) {
    if (!str) return '';
    return str.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .trim();
}

function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Chuyển địa chỉ thành object có đủ trường để hiển thị và tìm kiếm
function parseAddress(item, tdps) {
    let ten = '', dc = '', tdpId = '';

    if (item.length === 2) {
        ten = item[0]; dc = item[0]; tdpId = item[1];
    } else if (item.length === 3) {
        ten = item[0]; dc = item[1]; tdpId = item[2];
    }

    let addressToClean = dc || ten || '';
    let note = '';
    const parenMatch = addressToClean.match(/\(([^)]+)\)/);
    if (parenMatch) {
        note = '(' + parenMatch[1].trim() + ')';
        addressToClean = addressToClean.replace(/\([^)]+\)/, '').trim();
    }

    const header = addressToClean.toUpperCase();
    const subLines = [];
    if (note) subLines.push(note.toUpperCase());

    const tdpInfo = tdps[tdpId];
    const tdpName = tdpInfo ? tdpInfo.name : tdpId;

    const cleanTen = ten.trim();
    const cleanDc  = dc.trim();
    if (cleanTen && cleanDc && cleanTen.toLowerCase() !== cleanDc.toLowerCase()) {
        let displayTen = cleanTen;
        if (displayTen === displayTen.toUpperCase()) displayTen = toTitleCase(displayTen);
        subLines.push(displayTen);
    }

    if (subLines.length === 0) subLines.push(tdpName);
    else if (note) subLines.push(tdpName);

    const searchTerms = [
        removeDiacritics(ten),
        removeDiacritics(dc),
        removeDiacritics(tdpName),
        tdpId.toLowerCase()
    ].join(' ');

    return { header, subLines, tdpId, tdpName, tdpInfo, searchTerms };
}

// ─── Khởi tạo ứng dụng ──────────────────────────────────────

const LS_KEY      = 'namdinh_data_v1';
const LS_TIME_KEY = 'namdinh_data_time';

async function init() {
    try {
        let loadedData = null;
        let source = '';

        // Ưu tiên đọc từ localStorage nếu có (dữ liệu đã update thủ công)
        const cached = localStorage.getItem(LS_KEY);
        if (cached) {
            try {
                loadedData = JSON.parse(cached);
                const savedTime = localStorage.getItem(LS_TIME_KEY);
                source = savedTime
                    ? `Cập nhật lần cuối: ${new Date(+savedTime).toLocaleString('vi-VN')}`
                    : 'Dữ liệu đã cập nhật thủ công';
            } catch (e) {
                localStorage.removeItem(LS_KEY);
                localStorage.removeItem(LS_TIME_KEY);
            }
        }

        // Nếu không có localStorage thì đọc data.json gốc
        if (!loadedData) {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Không thể tải dữ liệu.');
            loadedData = await response.json();
            source = 'Dữ liệu mặc định (data.json)';
        }

        rawData = loadedData;
        processedAddresses = rawData.addresses.map(item => parseAddress(item, rawData.tdps));
        filteredAddresses  = [...processedAddresses];

        if (initialLoading) initialLoading.remove();
        searchInput.disabled = false;
        searchInput.placeholder = `Tìm kiếm trong ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ...`;

        // Hiển thị nguồn dữ liệu trên tooltip nút update
        updateBtn.title = source;

        renderNextPage();
        updateSearchCount();
        setupInfiniteScroll();

    } catch (error) {
        console.error('Lỗi khởi tạo:', error);
        cardsContainer.innerHTML = `
            <div class="spinner-container">
                <span class="material-symbols-outlined" style="font-size:48px;color:var(--primary-red)">error</span>
                <p style="margin-top:10px;font-weight:600">Không thể tải dữ liệu địa chỉ.</p>
                <p style="font-size:13px;color:var(--text-muted)">Vui lòng kiểm tra lại kết nối hoặc tải lại trang.</p>
            </div>
        `;
    }
}

// ─── Infinite Scroll ─────────────────────────────────────────

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && loadedIndex < filteredAddresses.length) {
            scrollSentinel.classList.add('loading');
            setTimeout(() => {
                renderNextPage();
                scrollSentinel.classList.remove('loading');
            }, 150);
        }
    }, { rootMargin: '100px' });
    observer.observe(scrollSentinel);
}

function renderNextPage() {
    const nextBatch = filteredAddresses.slice(loadedIndex, loadedIndex + PAGE_SIZE);

    if (nextBatch.length === 0 && loadedIndex === 0) {
        emptyState.classList.remove('hidden');
        scrollSentinel.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    scrollSentinel.classList.remove('hidden');

    if (loadedIndex + nextBatch.length >= filteredAddresses.length) {
        scrollSentinel.classList.add('hidden');
    }

    nextBatch.forEach(addr => {
        const card = createCardElement(addr);
        cardsContainer.appendChild(card);
    });

    loadedIndex += nextBatch.length;
}

// ─── Tạo card địa chỉ ────────────────────────────────────────

function createCardElement(addr) {
    const card = document.createElement('div');
    card.className = 'address-card';

    const sublinesHtml = addr.subLines.map((line, idx) => {
        const className = idx === 0 ? 'card-subtitle' : 'card-subtitle-2';
        return `<div class="${className}">${line}</div>`;
    }).join('');

    const tdp   = addr.tdpInfo;
    const cskv  = tdp ? tdp.cskv : null;
    const hs    = tdp ? tdp.hs   : null;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-title-row">
                <h2 class="card-title">${addr.header}</h2>
                <span class="tdp-badge">${addr.tdpId}</span>
            </div>
            ${sublinesHtml}
        </div>
        <div class="card-body">
            ${createOfficerColumn('CSKV', cskv)}
            ${createOfficerColumn('Hình sự', hs)}
        </div>
    `;

    setupCopyButtonEvents(card);
    return card;
}

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

function formatPhoneNumber(phone) {
    if (!phone) return '-';
    const cleaned = ('' + phone).replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0,4)}.${cleaned.slice(4,7)}.${cleaned.slice(7)}`;
    }
    return phone;
}

function setupCopyButtonEvents(cardElement) {
    cardElement.querySelectorAll('.btn-copy:not([disabled])').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const phone = btn.getAttribute('data-phone');
            if (!phone) return;
            navigator.clipboard.writeText(phone).then(() => {
                showToast(`Đã sao chép SĐT: ${formatPhoneNumber(phone)}`);
            }).catch(() => {
                const tmp = document.createElement('input');
                tmp.value = phone;
                document.body.appendChild(tmp);
                tmp.select();
                document.execCommand('copy');
                document.body.removeChild(tmp);
                showToast(`Đã sao chép SĐT: ${formatPhoneNumber(phone)}`);
            });
        });
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-success-icon">check_circle</span>
        <span>${message}</span>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.25s ease-in forwards';
        setTimeout(() => toast.remove(), 250);
    }, 2500);
}

// ─── Tìm kiếm ────────────────────────────────────────────────

function handleSearch(query) {
    const cleanedQuery = removeDiacritics(query);

    if (!cleanedQuery) {
        filteredAddresses = [...processedAddresses];
        clearBtn.classList.add('hidden');
    } else {
        clearBtn.classList.remove('hidden');
        const queryTerms = cleanedQuery.split(/\s+/).filter(t => t.length > 0);
        filteredAddresses = processedAddresses.filter(addr =>
            queryTerms.every(term => addr.searchTerms.includes(term))
        );
    }

    cardsContainer.innerHTML = '';
    loadedIndex = 0;
    renderNextPage();
    updateSearchCount();
}

function updateSearchCount() {
    if (!searchInput.value.trim()) {
        searchCount.classList.add('hidden');
        return;
    }
    searchCount.classList.remove('hidden');
    searchCount.textContent = `${filteredAddresses.length.toLocaleString('vi-VN')} kết quả`;
}

searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleSearch(e.target.value), 200);
});

clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch('');
    searchInput.focus();
});

// ─── Nút UPDATE có mật khẩu ──────────────────────────────────

const CORRECT_PASSWORD = 'Kingdo110191@';

const SHEET_ID   = '1GLdE_YZ7-Q5oHVDyEun3jhZ9PoKtYblh2s9--YB8mxc';
const SHEET_URLS = {
    diaChi:   `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
    toDanPho: `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1009809564`,
    canBo:    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=307313476`,
};

const updateBtn         = document.getElementById('update-btn');
const passwordModal     = document.getElementById('password-modal');
const passwordInput     = document.getElementById('password-input');
const pwError           = document.getElementById('pw-error');
const modalCancelBtn    = document.getElementById('modal-cancel-btn');
const modalConfirmBtn   = document.getElementById('modal-confirm-btn');
const togglePwBtn       = document.getElementById('toggle-pw-btn');
const togglePwIcon      = document.getElementById('toggle-pw-icon');
const updateOverlay     = document.getElementById('update-overlay');
const updateStatusTitle = document.getElementById('update-status-title');
const updateStatusDesc  = document.getElementById('update-status-desc');

// Mở modal nhập mật khẩu
updateBtn.addEventListener('click', () => {
    passwordInput.value = '';
    passwordInput.classList.remove('error');
    pwError.classList.add('hidden');
    passwordModal.classList.remove('hidden');
    setTimeout(() => passwordInput.focus(), 100);
});

// Hiện/ẩn mật khẩu
togglePwBtn.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePwIcon.textContent = 'visibility_off';
    } else {
        passwordInput.type = 'password';
        togglePwIcon.textContent = 'visibility';
    }
});

// Huỷ modal
modalCancelBtn.addEventListener('click', closePasswordModal);
passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) closePasswordModal();
});

// Nhấn Enter để xác nhận
passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') modalConfirmBtn.click();
});

// Xác nhận mật khẩu
modalConfirmBtn.addEventListener('click', () => {
    if (passwordInput.value !== CORRECT_PASSWORD) {
        passwordInput.classList.add('error');
        pwError.classList.remove('hidden');
        setTimeout(() => passwordInput.classList.remove('error'), 400);
        return;
    }
    closePasswordModal();
    startDataUpdate();
});

function closePasswordModal() {
    passwordModal.classList.add('hidden');
    passwordInput.value = '';
    passwordInput.type  = 'password';
    togglePwIcon.textContent = 'visibility';
    pwError.classList.add('hidden');
}

// Parse CSV đơn giản hỗ trợ quoted fields
function parseCSV(text) {
    const rows = [];
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        const cols = [];
        let inQuote = false, cur = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else inQuote = !inQuote;
            } else if (ch === ',' && !inQuote) {
                cols.push(cur.trim()); cur = '';
            } else {
                cur += ch;
            }
        }
        cols.push(cur.trim());
        rows.push(cols);
    }
    return rows;
}

// ─── Hàm cập nhật dữ liệu chính ─────────────────────────────

async function startDataUpdate() {
    // BƯỚC 0: Xoá dữ liệu cũ NGAY LẬP TỨC
    rawData            = null;
    processedAddresses = [];
    filteredAddresses  = [];
    loadedIndex        = 0;
    cardsContainer.innerHTML = '';
    searchInput.value        = '';
    searchInput.disabled     = true;
    searchInput.placeholder  = 'Đang cập nhật dữ liệu...';
    searchCount.classList.add('hidden');
    emptyState.classList.add('hidden');
    scrollSentinel.classList.add('hidden');

    // Hiện overlay và nút quay
    updateBtn.classList.add('spinning');
    updateOverlay.classList.remove('hidden');
    setUpdateStatus('⏳ Đang kết nối Google Sheets...', 'Bước 1/3 — Tải danh sách Địa chỉ nhà...');

    try {
        // BƯỚC 1: Sheet Địa chỉ nhà
        const r1 = await fetch(SHEET_URLS.diaChi);
        if (!r1.ok) throw new Error(`Không tải được sheet Địa chỉ nhà (HTTP ${r1.status}).`);
        const diaChiRows = parseCSV(await r1.text());
        setUpdateStatus('⏳ Đang tải dữ liệu...', 'Bước 2/3 — Tải danh sách Tổ dân phố...');

        // BƯỚC 2: Sheet Tổ dân phố
        const r2 = await fetch(SHEET_URLS.toDanPho);
        if (!r2.ok) throw new Error(`Không tải được sheet Tổ dân phố (HTTP ${r2.status}).`);
        const tdpRows = parseCSV(await r2.text());
        setUpdateStatus('⏳ Đang tải dữ liệu...', 'Bước 3/3 — Tải danh sách Cán bộ...');

        // BƯỚC 3: Sheet Cán bộ
        const r3 = await fetch(SHEET_URLS.canBo);
        if (!r3.ok) throw new Error(`Không tải được sheet Cán bộ (HTTP ${r3.status}).`);
        const canBoRows = parseCSV(await r3.text());
        setUpdateStatus('⚙️ Đang xử lý...', 'Ghép thông tin Cán bộ với Tổ dân phố và Địa chỉ...');

        // Xây officerMap: mã CB → { name, phone }
        // Cột: [0]=Mã, [2]=Tên ngắn, [3]=Tên đầy đủ, [7]=SĐT
        const officerMap = {};
        for (let i = 1; i < canBoRows.length; i++) {
            const r = canBoRows[i];
            if (!r || r.length < 8) continue;
            const ma  = (r[0] || '').trim();
            const ten = (r[3] || r[2] || '').trim();
            const sdt = (r[7] || '').replace(/\D/g, '').trim();
            if (ma && ten) officerMap[ma] = { name: ten, phone: sdt };
        }

        // Xây tdpMap: mã TDP → { name, cskv, hs }
        // Cột: [0]=Mã TDP, [1]=Tên TDP, [4]=Mã CSKV, [6]=Mã Hình sự
        const tdpMap = {};
        for (let i = 1; i < tdpRows.length; i++) {
            const r = tdpRows[i];
            if (!r || r.length < 7) continue;
            const ma = (r[0] || '').trim();
            if (!ma) continue;
            tdpMap[ma] = {
                name: (r[1] || '').trim() || ma,
                cskv: officerMap[(r[4] || '').trim()] || null,
                hs:   officerMap[(r[6] || '').trim()] || null,
            };
        }

        // Xây danh sách địa chỉ
        // Cột: [0]=ID nhà, [2]=Tên gọi, [3]=Địa chỉ sổ đỏ, [5]=Mã TDP
        const newAddresses = [];
        for (let i = 1; i < diaChiRows.length; i++) {
            const r     = diaChiRows[i];
            if (!r || r.length < 6) continue;
            const ten   = (r[2] || '').trim().replace(/\s+/g, ' ');
            const dc    = (r[3] || '').trim().replace(/\s+/g, ' ');
            const tdpId = (r[5] || '').trim();
            if (!tdpId || (!ten && !dc)) continue;
            if      (!dc)        newAddresses.push([ten, tdpId]);
            else if (!ten)       newAddresses.push([dc,  tdpId]);
            else if (ten === dc) newAddresses.push([ten, tdpId]);
            else                 newAddresses.push([ten, dc, tdpId]);
        }

        setUpdateStatus('✅ Hoàn tất!', `Đã tải ${newAddresses.length.toLocaleString('vi-VN')} địa chỉ. Đang hiển thị...`);
        await new Promise(resolve => setTimeout(resolve, 400));

        // Đổ dữ liệu mới vào ứng dụng
        rawData            = { addresses: newAddresses, tdps: tdpMap };
        processedAddresses = rawData.addresses.map(item => parseAddress(item, rawData.tdps));
        filteredAddresses  = [...processedAddresses];

        // Lưu vào localStorage để F5 vẫn giữ dữ liệu mới
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(rawData));
            localStorage.setItem(LS_TIME_KEY, Date.now().toString());
        } catch (e) {
            console.warn('Không lưu được vào localStorage:', e);
        }

        searchInput.disabled    = false;
        searchInput.placeholder = `Tìm kiếm trong ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ...`;
        updateBtn.title = `Cập nhật lần cuối: ${new Date().toLocaleString('vi-VN')}`;
        renderNextPage();
        updateSearchCount();
        setupInfiniteScroll();

        updateOverlay.classList.add('hidden');
        updateBtn.classList.remove('spinning');
        showToast(`✅ Đã cập nhật ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ mới nhất!`);

    } catch (err) {
        console.error('Lỗi cập nhật:', err);
        updateOverlay.classList.add('hidden');
        updateBtn.classList.remove('spinning');
        searchInput.disabled    = false;
        searchInput.placeholder = 'Tìm kiếm địa chỉ, tên đường...';

        // Nếu lỗi nhưng app đã có data cũ → giữ lại
        if (processedAddresses.length > 0) {
            filteredAddresses = [...processedAddresses];
            cardsContainer.innerHTML = '';
            loadedIndex = 0;
            renderNextPage();
            searchInput.placeholder = `Tìm kiếm trong ${processedAddresses.length.toLocaleString('vi-VN')} địa chỉ...`;
        } else {
            cardsContainer.innerHTML = `
                <div class="spinner-container">
                    <span class="material-symbols-outlined" style="font-size:48px;color:var(--primary-red)">error</span>
                    <p style="margin-top:10px;font-weight:600">Cập nhật thất bại.</p>
                    <p style="font-size:13px;color:var(--text-muted)">Vui lòng kiểm tra kết nối và thử lại.</p>
                </div>
            `;
        }
        showToast('❌ Lỗi: ' + err.message);
    }
}

function setUpdateStatus(title, desc) {
    updateStatusTitle.textContent = title;
    updateStatusDesc.textContent  = desc;
}

// ─── Khởi chạy ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
