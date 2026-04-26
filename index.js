import { eventSource, event_types } from "../../../../script.js";
import { registerFunctionTool } from "../../../extensions.js";
import { executeSQL } from "./server/tools/query_sql.js";
import { executeCreateTable } from "./server/tools/create_table.js";
import { importData } from "./server/tools/import_data.js";
import { exportData } from "./server/tools/export_data.js";
import { createMemoryTable, insertMemory, searchMemory } from "./server/memory/fts.js";
import { listTables, getTableSchema, executeWithRetry } from "./server/tools/sql_planner.js";

console.log("SQL Agent Loaded");

const dbPath = "./server/db/default.db";

let SlashCommandParser;

try {
    SlashCommandParser = require("../../../../scripts slash commands.js");
} catch (e) {
    console.warn("SlashCommandParser not available:", e.message);
}

jQuery(async () => {
    console.log("Initializing SQL Agent");

    try {
        createMemoryTable(dbPath);
        console.log("FTS5 Memory table initialized");
    } catch (e) {
        console.warn("Memory table may already exist:", e.message);
    }

    if (SlashCommandParser) {
        SlashCommandParser.addCommandObject({
            name: "sql",
            callback: async (args, value) => {
                try {
                    const result = await executeWithRetry(value, dbPath);
                    if (result.success) {
                        return JSON.stringify(result.data, null, 2);
                    } else {
                        return `SQL Error: ${result.error}`;
                    }
                } catch (e) {
                    return `Error: ${e.message}`;
                }
            },
            aliases: ["query", "db"],
            description: "Execute SQL query on the database"
        });

        SlashCommandParser.addCommandObject({
            name: "tables",
            callback: async () => {
                try {
                    const result = listTables(dbPath);
                    if (result.success) {
                        return `Tables: ${result.tables.join(", ")}`;
                    } else {
                        return `Error: ${result.error}`;
                    }
                } catch (e) {
                    return `Error: ${e.message}`;
                }
            },
            description: "List all tables in the database"
        });

        SlashCommandParser.addCommandObject({
            name: "schema",
            callback: async (args, value) => {
                try {
                    const result = getTableSchema(value, dbPath);
                    if (result.success) {
                        return JSON.stringify(result.schema, null, 2);
                    } else {
                        return `Error: ${result.error}`;
                    }
                } catch (e) {
                    return `Error: ${e.message}`;
                }
            },
            description: "Show schema for a table"
        });

        SlashCommandParser.addCommandObject({
            name: "memory",
            callback: async (args, value) => {
                try {
                    if (value) {
                        const result = await insertMemory(value, dbPath);
                        return result.success ? "Memory stored" : `Error: ${result.error}`;
                    } else {
                        const result = await searchMemory("", dbPath);
                        if (result.success) {
                            return JSON.stringify(result.data, null, 2);
                        } else {
                            return `Error: ${result.error}`;
                        }
                    }
                } catch (e) {
                    return `Error: ${e.message}`;
                }
            },
            aliases: ["remember", "m"],
            description: "Store or search memory"
        });

        console.log("SQL Agent slash commands registered");
    }

    registerFunctionTool({
        name: "query_sql",
        description: "Execute SQL query safely on the SQLite database",
        parameters: {
            type: "object",
            properties: {
                sql: {
                    type: "string",
                    description: "The SQL query to execute"
                }
            },
            required: ["sql"]
        },
        action: async ({ sql }) => {
            const result = await executeWithRetry(sql, dbPath);
            return JSON.stringify(result);
        }
    });

    registerFunctionTool({
        name: "create_table",
        description: "Create a new SQLite table with auto-inferred schema",
        parameters: {
            type: "object",
            properties: {
                table_name: {
                    type: "string",
                    description: "Name of the table to create"
                },
                data_sample: {
                    type: "object",
                    description: "Sample data object to infer schema from"
                }
            },
            required: ["table_name", "data_sample"]
        },
        action: async ({ table_name, data_sample }) => {
            const result = await executeCreateTable(table_name, data_sample, dbPath);
            return JSON.stringify(result);
        }
    });

    registerFunctionTool({
        name: "import_data",
        description: "Import data into SQLite database",
        parameters: {
            type: "object",
            properties: {
                format: {
                    type: "string",
                    enum: ["csv", "json", "markdown", "logs"],
                    description: "Data format"
                },
                content: {
                    type: "string",
                    description: "The content to import"
                },
                table_name: {
                    type: "string",
                    description: "Target table name"
                }
            },
            required: ["format", "content", "table_name"]
        },
        action: async ({ format, content, table_name }) => {
            const result = await importData(format, content, table_name, dbPath);
            return JSON.stringify(result);
        }
    });

    registerFunctionTool({
        name: "export_data",
        description: "Export data from SQLite database",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "SQL query to fetch data"
                },
                format: {
                    type: "string",
                    enum: ["csv", "json", "markdown"],
                    description: "Export format"
                }
            },
            required: ["query", "format"]
        },
        action: async ({ query, format }) => {
            const result = await exportData(query, format, dbPath);
            return result;
        }
    });

    registerFunctionTool({
        name: "search_memory",
        description: "Search the FTS5 memory table for relevant information",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "Search query"
                }
            },
            required: ["query"]
        },
        action: async ({ query }) => {
            const result = await searchMemory(query, dbPath);
            return JSON.stringify(result);
        }
    });

    registerFunctionTool({
        name: "store_memory",
        description: "Store information in FTS5 memory",
        parameters: {
            type: "object",
            properties: {
                content: {
                    type: "string",
                    description: "Content to store"
                }
            },
            required: ["content"]
        },
        action: async ({ content }) => {
            const result = await insertMemory(content, dbPath);
            return JSON.stringify(result);
        }
    });

    registerFunctionTool({
        name: "list_tables",
        description: "List all tables in the SQLite database",
        parameters: {
            type: "object",
            properties: {},
            required: []
        },
        action: async () => {
            const result = listTables(dbPath);
            return JSON.stringify(result);
        }
    });

    registerFunctionTool({
        name: "get_table_schema",
        description: "Get the schema of a specific table",
        parameters: {
            type: "object",
            properties: {
                table_name: {
                    type: "string",
                    description: "Name of the table"
                }
            },
            required: ["table_name"]
        },
        action: async ({ table_name }) => {
            const result = getTableSchema(table_name, dbPath);
            return JSON.stringify(result);
        }
    });

    console.log("SQL Agent tools registered");
});

eventSource.on(event_types.CHAT_MESSAGE_RECEIVED, async (data) => {
    const message = data?.message?.content || "";
    const preferencePatterns = [
        /记住.*?喜欢(.+)/i,
        /remember.*?likes?(.+)/i,
        /用户喜欢(.+)/i,
        /user prefers(.+)/i
    ];

    for (const pattern of preferencePatterns) {
        const match = message.match(pattern);
        if (match) {
            const preference = match[1].trim();
            try {
                await insertMemory(`用户偏好: ${preference}`, dbPath, "preference");
                console.log("Stored user preference:", preference);
            } catch (e) {
                console.warn("Failed to store preference:", e.message);
            }
            break;
        }
    }
});

export { dbPath };