import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.MCP_SERVER_PORT || 5001;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000/api';

const mcpServer = new McpServer(
  {
    name: 'expensetracker-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
const server = mcpServer.server;

// Define tool schemas
const toolsList = [
  {
    name: 'create_expense',
    description: 'Create a new expense transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount of the expense' },
        category: { type: 'string', description: 'Expense category (Food, Travel, Shopping, Bills, etc)' },
        description: { type: 'string', description: 'Detail/merchant name' },
        date: { type: 'string', description: 'Optional date in YYYY-MM-DD format' },
      },
      required: ['amount', 'category', 'description'],
    },
  },
  {
    name: 'update_expense',
    description: 'Update an existing expense.',
    inputSchema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'ID of the expense to update' },
        amount: { type: 'number', description: 'New amount' },
        category: { type: 'string', description: 'New category' },
        description: { type: 'string', description: 'New description' },
        date: { type: 'string', description: 'New date in YYYY-MM-DD' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'delete_expense',
    description: 'Delete an expense transaction.',
    inputSchema: {
      type: 'object',
      properties: {
        expenseId: { type: 'string', description: 'ID of the expense to delete' },
      },
      required: ['expenseId'],
    },
  },
  {
    name: 'get_expenses',
    description: 'Retrieve expenses filtered by month.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Optional month in YYYY-MM format' },
      },
    },
  },
  {
    name: 'get_monthly_summary',
    description: 'Retrieve monthly spending summary (total spending and top category).',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
      },
      required: ['month'],
    },
  },
  {
    name: 'get_category_breakdown',
    description: 'Retrieve category-wise spending breakdown for a specific month.',
    inputSchema: {
      type: 'object',
      properties: {
        month: { type: 'string', description: 'Month in YYYY-MM format' },
      },
      required: ['month'],
    },
  },
];

// Helper to construct headers with the token
function getHeaders(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Implement Tool Handler logic
async function runTool(name: string, args: any, token?: string): Promise<any> {
  const headers = getHeaders(token);

  switch (name) {
    case 'create_expense': {
      const response = await axios.post(`${BACKEND_URL}/expenses`, args, { headers });
      return response.data;
    }
    case 'update_expense': {
      const { expenseId, ...updateData } = args;
      const response = await axios.put(`${BACKEND_URL}/expenses/${expenseId}`, updateData, { headers });
      return response.data;
    }
    case 'delete_expense': {
      const { expenseId } = args;
      const response = await axios.delete(`${BACKEND_URL}/expenses/${expenseId}`, { headers });
      return response.data;
    }
    case 'get_expenses': {
      const { month } = args;
      const url = month ? `${BACKEND_URL}/expenses?month=${month}` : `${BACKEND_URL}/expenses`;
      const response = await axios.get(url, { headers });
      return response.data;
    }
    case 'get_monthly_summary': {
      const { month } = args;
      const response = await axios.get(`${BACKEND_URL}/analytics/summary?month=${month}`, { headers });
      return response.data;
    }
    case 'get_category_breakdown': {
      const { month } = args;
      const response = await axios.get(`${BACKEND_URL}/analytics/breakdown?month=${month}`, { headers });
      return response.data;
    }
    default:
      throw new Error(`Tool not found: ${name}`);
  }
}

// Register SDK handlers
server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    return { tools: toolsList };
  }
);

server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await runTool(name, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: err.message }],
      };
    }
  }
);

// Express Server Setup
const app = express();
app.use(cors());
app.use(express.json());

const transports: Record<string, StreamableHTTPServerTransport> = {};

// Unified MCP HTTP/SSE endpoint
app.all('/mcp', async (req, res) => {
  try {
    const sessionId = req.headers['mcp-session-id'] as string;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && req.method === 'POST') {
      transport = new StreamableHTTPServerTransport({
        onsessioninitialized: (id) => {
          transports[id] = transport;
        },
      });

      transport.onclose = () => {
        const id = transport.sessionId;
        if (id && transports[id]) {
          delete transports[id];
        }
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).send('Bad Request: Invalid session or request method');
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
});

// Custom direct HTTP endpoint to bypass full SSE overhead for backend-orchestrated chatbot calls.
// Captures Authorization token from backend and forwards it to secure backend routes.
app.post('/api/mcp', async (req, res) => {
  const { method, params } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (method === 'tools/list') {
    return res.json({ tools: toolsList });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    try {
      const result = await runTool(name, args, token);
      return res.json(result);
    } catch (error: any) {
      console.error(`Direct MCP tool execution error [${name}]:`, error.message);
      return res.status(error.response?.status || 500).json({
        success: false,
        error: error.response?.data?.message || error.message,
      });
    }
  }

  return res.status(400).json({ error: 'Unsupported method' });
});

app.listen(PORT, () => {
  console.log(`MCP server listening on port ${PORT}`);
});
