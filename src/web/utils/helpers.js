import { API_ENDPOINTS } from "./constants"

export function GetAPIEndpoints() {
    if (window.appContext.imsEnv === 'stg') {
        return API_ENDPOINTS['STAGE'];
    }
    return API_ENDPOINTS['PROD'];
}

export function GetImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const [url, cleanup] = (typeof src === 'string')
            ? [src, () => {}]
            : [URL.createObjectURL(src), () => URL.revokeObjectURL(url)];
        img.onload = () => {
            cleanup();
            resolve(img);
        };
        img.onerror = (error) => {
            cleanup();
            reject(null);
        };
        img.cleanup = cleanup;
        img.src = url;
    });
}
