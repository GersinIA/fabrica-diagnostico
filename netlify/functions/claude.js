exports.handler = async (event) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.ANTHROPIC_API_KEY;

        if (!apiKey) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Missing API Key. Por favor, adicione ANTHROPIC_API_KEY no arquivo .env" })
            };
        }

        // Usando fetch nativo do Node.js (v18+)
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-3-haiku-20240307",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }],
            }),
        });

        const data = await resp.json();

        if (!resp.ok) {
            console.error("Erro na Anthropic:", data);
            return { statusCode: 500, body: JSON.stringify({ error: "Erro na API da Anthropic" }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        console.error("Erro interno:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
