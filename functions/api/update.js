/**
 * POST /api/update
 * Nhận dữ liệu mới từ app (sau khi fetch từ Google Sheets),
 * xác thực bằng header bí mật, sau đó lưu vào Cloudflare KV.
 */

const UPDATE_SECRET = 'Kingdo110191@';

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

    try {
        const data = await request.json();

        // Lưu dữ liệu và thời gian cập nhật vào KV
        await env.ADDR_DATA.put('latest', JSON.stringify(data));
        await env.ADDR_DATA.put('updated_at', Date.now().toString());

        return new Response(JSON.stringify({
            success: true,
            count: data.addresses ? data.addresses.length : 0,
            updated_at: new Date().toISOString(),
        }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Lỗi lưu dữ liệu: ' + e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
}
