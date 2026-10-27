export class AppInfoUtils {
    static async getExecutablePath(): Promise<string> {
        const getExecutablePath = window.saucer?.exposed?.app_getExecutablePath;
        if (!getExecutablePath) {
            throw new Error('Application info API is not available');
        }

        const path = await getExecutablePath();
        if (!path) {
            throw new Error('Application executable path is unavailable');
        }

        return path;
    }
}
