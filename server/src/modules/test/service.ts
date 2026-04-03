export abstract class TestService {

    static getAppInfo() {
        return {
            appName: "glue-chat backend server",
            version: "1.0.0",
            framework: "Elysia.js",
            runtime: "Bun",
            timestamp: new Date().toISOString()
        }
    }
}