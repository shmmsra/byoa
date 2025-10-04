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

export { GetClipboardData };
