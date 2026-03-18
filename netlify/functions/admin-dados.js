exports.handler = async (event) => {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
    const pat = process.env.NETLIFY_PAT;
    const siteId = process.env.SITE_ID;

    if (!pat || !siteId) {
        return { statusCode: 500, body: JSON.stringify({ error: "Falta configurar credenciais para API do Netlify forms na nuvem" }) };
    }

    const url = `https://api.netlify.com/api/v1/sites/${siteId}/submissions`;

    try {
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${pat}` } });
        if (!resp.ok) {
            return { statusCode: 500, body: JSON.stringify({ error: "Erro do Netlify API" }) };
        }
        const data = await resp.json();
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (e) { return { statusCode: 500, body: JSON.stringify({ error: e.message }) }; }
}
