/**
 * GET /api/data
 * Trả về dữ liệu mới nhất từ Cloudflare KV.
 * Nếu KV chưa có dữ liệu → trả về 404 để app tự fallback về data.json
 */
export async function onRequestGet({ env }) {
    try {
        const data = await env.ADDR_DATA.get('latest', { type: 'json' });
        if (!data) {
            return new Response(JSON.stringify({ error: 'Chưa có dữ liệu trong KV' }), {
                status: 404,
                headers: corsHeaders('application/json'),
            });
        }
        return new Response(JSON.stringify(data), {
            headers: {
                ...corsHeaders('application/json'),
                'Cache-Control': 'no-store', // Luôn lấy mới nhất
            },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Lỗi KV: ' + e.message }), {
            status: 500,
            headers: corsHeaders('application/json'),
        });
    }
}

function corsHeaders(contentType) {
    return {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
    };
}
