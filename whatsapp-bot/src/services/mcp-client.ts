
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import fs from "fs";

// Configuration for the Local MCP Server
// We point to the OTHER repository where the MCP server lives
const MCP_SERVER_REPO_PATH = "C:\\Users\\dave_\\.gemini\\antigravity\\scratch\\antigravity-notebooklm-mcp-repo";
const MCP_SERVER_SCRIPT_PATH = path.join(MCP_SERVER_REPO_PATH, "build", "index.js");

export class NotebookLMMCPService {
    private client: Client | null = null;
    private transport: StdioClientTransport | null = null;
    private isConnected: boolean = false;

    constructor() {
    }

    async connect() {
        if (this.isConnected) return;

        console.log("🔌 Connecting to NotebookLM MCP Server...");
        console.log(`   Script: ${MCP_SERVER_SCRIPT_PATH}`);

        if (!fs.existsSync(MCP_SERVER_SCRIPT_PATH)) {
            throw new Error(`MCP Server compiled script not found at: ${MCP_SERVER_SCRIPT_PATH}. Please run 'npm run build' in the MCP repo.`);
        }

        try {
            this.transport = new StdioClientTransport({
                command: "node",
                args: [MCP_SERVER_SCRIPT_PATH],
                stderr: "inherit" // Crucial for debugging server startup errors
            });

            this.client = new Client({
                name: "whatsapp-bot-client",
                version: "1.0.0",
            }, {
                capabilities: {
                },
            });

            await this.client.connect(this.transport);
            this.isConnected = true;
            console.log("✅ MCP Server Connected!");

            // List tools to verify
            const tools = await this.client.listTools();
            console.log(`   Available tools: ${tools.tools.map(t => t.name).join(", ")}`);

        } catch (error) {
            console.error("❌ Failed to connect to MCP Server:", error);
            this.isConnected = false;
            throw error;
        }
    }

    async queryNotebook(notebookId: string, query: string, conversationId?: string): Promise<string> {
        if (!this.isConnected || !this.client) {
            await this.connect();
        }

        try {
            console.log(`📤 Sending query to NotebookLM (${notebookId}): "${query.substring(0, 50)}..."`);

            const result = await this.client!.callTool({
                name: "query_notebook",
                arguments: {
                    notebook_id: notebookId,
                    query: query,
                    conversation_id: conversationId
                }
            }, undefined, {
                timeout: 180000 // 180 seconds = 3 minutes for browser automation
            });

            // Parse result
            // The tool returns { content: [{ type: "text", text: "..." }] }
            if (result.content && Array.isArray(result.content) && result.content.length > 0) {
                const textContent = result.content[0];
                if (textContent.type === 'text') {
                    return textContent.text;
                }
            }

            return "Error: No text content in MCP response.";

        } catch (error: any) {
            console.error("❌ Error performing query via MCP:", error);
            return `Error de connexió amb NotebookLM: ${error.message}`;
        }
    }

    async disconnect() {
        if (this.transport) {
            await this.transport.close();
        }
        this.isConnected = false;
    }
}

// Singleton instance
export const mcpService = new NotebookLMMCPService();
