export class Logger {
    static info(type: string, message: string) {
        console.log(`[${type.toUpperCase()}] ${new Date().toISOString()} — ${message}`);
    }

    static error(message: string) {
        console.error(`[ERROR] ${new Date().toISOString()} — ${message}`);
    }
}