import type { NetworkFetchOptions, NetworkFetchResponse } from '../types/window.d';

export async function InvokeLLM(
    baseURL: string,
    modelName: string,
    apiKey: string,
    systemContent: string,
    userContent: string,
) {
    console.info(`Invoking LLM with baseURL: ${baseURL}, modelName: ${modelName}`);

    // Base instruction that applies to all requests
    const baseInstruction =
        'CRITICAL INSTRUCTION: You are a direct output generator. Your ONLY job is to produce RAW OUTPUT with ZERO conversational elements. ' +
        '\n\n' +
        'ABSOLUTELY FORBIDDEN - Never start your response with ANY of these phrases or similar ones:\n' +
        '- "Here\'s..." / "Here is..." / "Here are..."\n' +
        '- "I understand..." / "I see..." / "I\'ve..." / "I can..."\n' +
        '- "The improved..." / "The corrected..." / "The result..."\n' +
        '- "Your answer..." / "Your result..."\n' +
        '- "Based on..." / "According to..."\n' +
        '- "Let me..." / "I will..."\n' +
        '- "Sure,..." \n' +
        '- Any explanatory prefix whatsoever\n' +
        '\n' +
        'YOUR FIRST WORD/CHARACTER MUST BE THE ACTUAL ANSWER ITSELF. ' +
        'DO NOT acknowledge the request. DO NOT introduce the answer. DO NOT add quotes around the answer unless they are part of the actual content. ' +
        'START IMMEDIATELY WITH THE ANSWER.\n\n';

    // Combine base instruction with the action-specific system content
    const fullSystemContent = baseInstruction + systemContent;

    // Prepare the request body
    const requestBody = {
        model: modelName,
        messages: [
            { role: 'system', content: fullSystemContent },
            { role: 'user', content: userContent },
        ],
    };

    // Prepare fetch options
    const options: NetworkFetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    };
    // Remove the trailing slashes and '/chat/completions' from the baseURL
    const baseURLWithoutTrailingSlashes = baseURL
        .replace(/\/$/, '')
        .replace(/\/chat\/completions$/, '');
    const llmURL = `${baseURLWithoutTrailingSlashes}/chat/completions`;

    try {
        // Use native network_fetch if available, otherwise fall back to browser fetch
        if (window.saucer?.exposed?.network_fetch) {
            console.info('Using native network_fetch');
            const responseJson = await window.saucer.exposed.network_fetch(
                llmURL,
                JSON.stringify(options),
            );
            const response: NetworkFetchResponse = JSON.parse(responseJson);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, body: ${response.body}`);
            }

            const data = JSON.parse(response.body);
            return data.choices[0].message.content;
        } else {
            // Fallback to browser fetch
            console.info('Falling back to browser fetch');
            const response = await fetch(llmURL, {
                method: options.method,
                headers: options.headers,
                body: options.body,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('Error invoking LLM:', error);
        throw error;
    }
}
