import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { authorize } from './auth';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { listFolderFiles, getDocText } from './services/google';
import { readSentinelFile } from './services/local';
import { z } from 'zod';

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

const server = new Server(
    {
        name: 'notebooklm-mcp',
        version: '0.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_notebook_sources',
                description: 'List source files in a specific Google Drive folder',
                inputSchema: {
                    type: 'object',
                    properties: {
                        folderId: { type: 'string', description: 'Google Drive folder ID' },
                    },
                    required: ['folderId'],
                },
            },
            {
                name: 'read_gdoc_content',
                description: 'Read the text content of a Google Doc source',
                inputSchema: {
                    type: 'object',
                    properties: {
                        fileId: { type: 'string', description: 'Google Doc file ID' },
                    },
                    required: ['fileId'],
                },
            },
            {
                name: 'read_local_sentinel_file',
                description: 'Read a file from the local Sentinel project directory',
                inputSchema: {
                    type: 'object',
                    properties: {
                        relativePath: { type: 'string', description: 'Path relative to Sentinel cover folder' },
                    },
                    required: ['relativePath'],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'list_notebook_sources') {
            const { folderId } = z.object({ folderId: z.string() }).parse(args);
            const files = await listFolderFiles(folderId);
            return { content: [{ type: 'text', text: JSON.stringify(files, null, 2) }] };
        }

        if (name === 'read_gdoc_content') {
            const { fileId } = z.object({ fileId: z.string() }).parse(args);
            const text = await getDocText(fileId);
            return { content: [{ type: 'text', text }] };
        }

        if (name === 'read_local_sentinel_file') {
            const { relativePath } = z.object({ relativePath: z.string() }).parse(args);
            const content = await readSentinelFile(relativePath);
            return { content: [{ type: 'text', text: content }] };
        }

        throw new Error(`Tool not found: ${name}`);
    } catch (error: any) {
        return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

async function main() {
    console.error('Iniciant autorització de Google...');
    await authorize();

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('NotebookLM MCP server running on stdio');
}

main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
