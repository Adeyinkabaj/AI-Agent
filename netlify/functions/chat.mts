import type { Context, Config } from "@netlify/functions";

interface GeminiRequest {
  query: string;
}

interface GeminiPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
  groundingMetadata?: {
    groundingAttributions?: Array<{
      web?: {
        uri?: string;
        title?: string;
      };
    }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: {
    message: string;
  };
}

async function fetchWithBackoff(
  url: string,
  options: RequestInit,
  maxRetries = 5
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status !== 429) {
        return response;
      }
    } catch (error) {
      console.error(`Fetch error on attempt ${i + 1}:`, error);
    }

    if (i < maxRetries - 1) {
      const delay = Math.pow(2, i) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("API request failed after multiple retries.");
}

export default async (req: Request, context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = Netlify.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key not configured" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body: GeminiRequest = await req.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const systemPrompt =
      "You are a helpful and knowledgeable research assistant. Your goal is to provide accurate, comprehensive, and well-organized answers to any question, whether it's related to IT, technology, science, history, current events, business, health, or any other topic. For technical questions, provide step-by-step solutions when appropriate. For research questions, synthesize information clearly and cite your sources. Always use the search results provided to ensure the information is current and grounded. Be friendly, professional, and thorough in your responses.";

    const payload = {
      contents: [{ parts: [{ text: query }] }],
      tools: [{ google_search: {} }],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    const apiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const response = await fetchWithBackoff(`${apiUrl}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result: GeminiResponse = await response.json();

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const candidate = result.candidates?.[0];
    let botResponseText =
      "Sorry, I couldn't get a clear answer right now. Please try rephrasing your question.";
    let sources: Array<{ uri: string; title: string }> = [];

    if (candidate && candidate.content?.parts?.[0]?.text) {
      botResponseText = candidate.content.parts[0].text;

      const groundingMetadata = candidate.groundingMetadata;
      if (groundingMetadata && groundingMetadata.groundingAttributions) {
        sources = groundingMetadata.groundingAttributions
          .map((attribution) => ({
            uri: attribution.web?.uri || "",
            title: attribution.web?.title || "",
          }))
          .filter((source) => source.uri && source.title);
      }
    }

    return new Response(
      JSON.stringify({
        response: botResponseText,
        sources,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config: Config = {
  path: "/api/chat",
};
