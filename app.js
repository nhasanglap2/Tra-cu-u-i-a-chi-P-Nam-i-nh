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

// Run Init
document.addEventListener('DOMContentLoaded', init);
