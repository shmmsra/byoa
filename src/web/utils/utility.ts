async function GetClipboardData() {
    try {
        // Use our native clipboard API if available, fallback to browser API
        if (window.saucer?.exposed?.clipboard_readText) {
            const text = await window.saucer.exposed.clipboard_readText();
            if (text) {
                return [{
                    type: 'text',
                    data: text,
                }];
            }
        } else {
            // Fallback to browser clipboard API
            const clipboardContents = await navigator.clipboard.read();
            for (const item of clipboardContents) {
                for (const i of item.types) {
                    if (i.startsWith('image/')) {
                        const blob = await item.getType(i);
                        return [{
                            type: 'image',
                            data: blob,
                        }];
                    } else if (i.startsWith('text/plain')) {
                        const blob = await item.getType(i);
                        const text = await blob.text();
                        return [{
                            type: 'text',
                            data: text,
                        }];
                    }
                }
            }
        }
    } catch (error) {
        console.error(error);
    }
    return null;
}

async function InvokeGemini(modelName: string, apiKey: string, prompt: string) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || data;
}
  
async function InvokeOpenAI(modelName: string, apiKey: string, prompt: string) {
    const endpoint = "https://api.openai.com/v1/chat/completions";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || data;
}
  
async function InvokePerplexity(modelName: string, apiKey: string, prompt: string) {
    const endpoint = "https://api.perplexity.ai/chat/completions";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || data;
}

export { GetClipboardData, InvokeGemini, InvokeOpenAI, InvokePerplexity };
