const ALLOWED = [
  "https://notprogramming-727ac.web.app",
  "https://notprogramming-727ac.firebaseapp.com",
  "http://localhost:5000",
];

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allow  = ALLOWED.includes(origin) ? origin : ALLOWED[0];
    const cors = {
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST")    return new Response("Method not allowed", { status: 405, headers: cors });

    try {
      const b = await req.json();
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: env.MODEL || "claude-sonnet-4-5",
          max_tokens: Math.min(Number(b.max_tokens) || 1000, 2000),
          system: String(b.system || "").slice(0, 4000),
          messages: (b.messages || []).slice(-15).map(m => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content || "").slice(0, 6000),
          })),
        }),
      });
      return new Response(await r.text(), {
        status: r.status,
        headers: { ...cors, "content-type": "application/json" },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...cors, "content-type": "application/json" },
      });
    }
  },
};
