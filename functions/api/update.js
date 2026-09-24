/**
 * POST /api/update
 * Nhận dữ liệu mới từ app, xác thực mật khẩu,
 * sau đó ghi thẳng file data.json lên GitHub qua GitHub API.
 * Cloudflare Pages tự động rebuild và deploy lại với data.json mới.
 */

const UPDATE_SECRET  = 'Kingdo110191@';
const GITHUB_OWNER   = 'nhasanglap2';
const GITHUB_REPO    = 'Tra-cu-u-i-a-chi-P-Nam-i-nh';
const GITHUB_FILE    = 'data.json';
const GITHUB_BRANCH  = 'main';

export async function onRequest({ request, env }) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Update-Secret',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    // Xác thực mật khẩu qua header
    const secret = request.headers.get('X-Update-Secret');
    if (secret !== UPDATE_SECRET) {
        return new Response(JSON.stringify({ error: 'Không có quyền truy cập' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    // Lấy GitHub token từ biến môi trường Cloudflare (bảo mật, không lộ ra ngoài)
    const GITHUB_TOKEN = env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
        return new Response(JSON.stringify({ error: 'Chưa cấu hình GITHUB_TOKEN trên Cloudflare' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    try {
        const newData = await request.json();

        // Nén JSON (không cần indent) để giảm kích thước file
        const content    = JSON.stringify(newData, null, 0);
        // Encode sang Base64 (GitHub API yêu cầu)
        const b64Content = btoa(unescape(encodeURIComponent(content)));

        const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
        const headers = {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept':        'application/vnd.github+json',
            'User-Agent':    'Cloudflare-Pages-Update-Function',
            'Content-Type':  'application/json',
        };

        // Bước 1: Lấy SHA của file hiện tại (cần để ghi đè)
        const shaRes = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, { headers });
        if (!shaRes.ok) {
            const e = await shaRes.json().catch(() => ({}));
            throw new Error(`Không lấy được SHA file: ${shaRes.status} — ${e.message || ''}`);
        }
        const { sha: currentSha } = await shaRes.json();

        // Bước 2: Ghi đè data.json mới lên GitHub
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        const pushRes = await fetch(apiBase, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: `Cập nhật dữ liệu địa chỉ ${now}`,
                content: b64Content,
                sha:     currentSha,
                branch:  GITHUB_BRANCH,
            }),
        });

        if (!pushRes.ok) {
            const e = await pushRes.json().catch(() => ({}));
            throw new Error(`Ghi GitHub thất bại: ${pushRes.status} — ${e.message || ''}`);
        }

        return new Response(JSON.stringify({
            success:  true,
            count:    newData.addresses ? newData.addresses.length : 0,
            message:  'data.json đã được ghi lên GitHub. Cloudflare sẽ tự rebuild trong ~1-2 phút.',
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (e) {
        console.error('Update error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}
