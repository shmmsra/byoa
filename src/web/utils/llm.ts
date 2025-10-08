import type { NetworkFetchOptions, NetworkFetchResponse } from '../types/window.d';

export async function InvokeLLM(
    baseURL: string,
    modelName: string,
    apiKey: string,
    prompt: string,
) {
    console.info(`Invoking LLM with baseURL: ${baseURL}, modelName: ${modelName}`);

    // Prepare the request body
    const requestBody = {
        model: modelName,
        messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt },
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
