import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:5001';

// Tool definitions for Gemini
const expenseTools = [
  {
    functionDeclarations: [
      {
        name: 'create_expense',
        description: 'Create a new expense transaction.',
        parameters: {
          type: 'OBJECT',
          properties: {
            amount: { type: 'NUMBER', description: 'The expense amount.' },
            category: { type: 'STRING', description: 'Category of expense (e.g., Food, Travel, Shopping, Bills).' },
            description: { type: 'STRING', description: 'Brief description of the expense.' },
            date: { type: 'STRING', description: 'Optional date of the expense in YYYY-MM-DD format.' },
          },
          required: ['amount', 'category', 'description'],
        },
      },
      {
        name: 'update_expense',
        description: 'Update an existing expense.',
        parameters: {
          type: 'OBJECT',
          properties: {
            expenseId: { type: 'STRING', description: 'The unique ID of the expense to update.' },
            amount: { type: 'NUMBER', description: 'Updated amount.' },
            category: { type: 'STRING', description: 'Updated category.' },
            description: { type: 'STRING', description: 'Updated description.' },
            date: { type: 'STRING', description: 'Updated date in YYYY-MM-DD.' },
          },
          required: ['expenseId'],
        },
      },
      {
        name: 'delete_expense',
        description: 'Delete an expense by ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            expenseId: { type: 'STRING', description: 'The unique ID of the expense to delete.' },
          },
          required: ['expenseId'],
        },
      },
      {
        name: 'get_expenses',
        description: 'Retrieve a list of expenses, optionally filtered by month in YYYY-MM.',
        parameters: {
          type: 'OBJECT',
          properties: {
            month: { type: 'STRING', description: 'Optional month in YYYY-MM format.' },
          },
        },
      },
      {
        name: 'get_monthly_summary',
        description: 'Get the total spending and top spending category for a specific month in YYYY-MM.',
        parameters: {
          type: 'OBJECT',
          properties: {
            month: { type: 'STRING', description: 'Month in YYYY-MM format.' },
          },
          required: ['month'],
        },
      },
      {
        name: 'get_category_breakdown',
        description: 'Get category-wise spending breakdown for a specific month in YYYY-MM.',
        parameters: {
          type: 'OBJECT',
          properties: {
            month: { type: 'STRING', description: 'Month in YYYY-MM format.' },
          },
          required: ['month'],
        },
      },
    ],
  },
];

// Execute MCP Tool call
async function executeMcpTool(name: string, args: any, token: string): Promise<any> {
  try {
    const response = await axios.post(
      `${MCP_SERVER_URL}/api/mcp`,
      {
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error: any) {
    console.error(`Error calling MCP tool ${name}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Fallback rule-based mock chatbot
async function handleMockChat(userMessage: string, token: string): Promise<string> {
  const msg = userMessage.toLowerCase();
  
  // Helper to extract amount
  const amountMatch = msg.match(/(?:rs\.?|inr|usd|spent|amount of|for)\s*(\d+(?:\.\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
  
  // Format current date
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (msg.includes('add') || msg.includes('create') || msg.includes('track') || msg.includes('spent')) {
    if (amount > 0) {
      let category = 'Other';
      if (msg.includes('food') || msg.includes('lunch') || msg.includes('dinner') || msg.includes('coffee') || msg.includes('restaurant')) category = 'Food';
      else if (msg.includes('cab') || msg.includes('taxi') || msg.includes('uber') || msg.includes('travel') || msg.includes('flight') || msg.includes('train')) category = 'Travel';
      else if (msg.includes('shopping') || msg.includes('shirt') || msg.includes('clothes') || msg.includes('amazon')) category = 'Shopping';
      else if (msg.includes('rent') || msg.includes('electricity') || msg.includes('bill')) category = 'Bills';

      let description = 'Expense added via chat';
      const descMatch = msg.match(/(?:for|description|on)\s+([a-zA-Z\s]+)(?:of|amount|$)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      const res = await executeMcpTool('create_expense', { amount, category, description, date: now.toISOString().split('T')[0] }, token);
      if (res.success) {
        return `I've successfully added an expense of **Rs. ${amount}** for **${description}** under the **${category}** category!`;
      }
    }
    return "I detected you wanted to add an expense, but couldn't parse the amount or details. Could you say something like 'Add Rs. 250 for lunch under Food'?";
  }

  if (msg.includes('summary') || msg.includes('total') || msg.includes('spent this month')) {
    const res = await executeMcpTool('get_monthly_summary', { month: currentMonth }, token);
    if (res && res.totalSpent !== undefined) {
      return `This month (${currentMonth}), your total spending is **Rs. ${res.totalSpent}**. Your top spending category is **${res.topCategory}**.`;
    }
    return "Sorry, I was unable to retrieve your monthly spending summary.";
  }

  if (msg.includes('breakdown') || msg.includes('category') || msg.includes('categories')) {
    const res = await executeMcpTool('get_category_breakdown', { month: currentMonth }, token);
    if (res && !res.success && Object.keys(res).length > 0) {
      // Axios response might return raw object or wrapped in data
      let categories = res;
      if (res.result) categories = res.result;
      
      let reply = `Here is your category breakdown for ${currentMonth}:\n`;
      Object.entries(categories).forEach(([cat, amt]) => {
        reply += `- **${cat}**: Rs. ${amt}\n`;
      });
      return reply;
    }
    // Handle standard object return
    if (res && typeof res === 'object') {
      let reply = `Here is your category breakdown for ${currentMonth}:\n`;
      let count = 0;
      Object.entries(res).forEach(([cat, amt]) => {
        if (typeof amt === 'number') {
          reply += `- **${cat}**: Rs. ${amt}\n`;
          count++;
        }
      });
      if (count > 0) return reply;
    }
    return "You have no expenses recorded for this month yet.";
  }

  if (msg.includes('list') || msg.includes('expenses') || msg.includes('show')) {
    const res = await executeMcpTool('get_expenses', { month: currentMonth }, token);
    if (res && res.expenses && res.expenses.length > 0) {
      let reply = `Here are your recent expenses for ${currentMonth}:\n`;
      res.expenses.slice(0, 5).forEach((exp: any) => {
        const d = new Date(exp.date).toLocaleDateString();
        reply += `- **Rs. ${exp.amount}** for *${exp.description}* (${exp.category}) on ${d} (ID: \`${exp._id}\`)\n`;
      });
      if (res.expenses.length > 5) {
        reply += `...and ${res.expenses.length - 5} more.`;
      }
      return reply;
    }
    return "No expenses found for this month.";
  }

  return "Hi! I am your AI Expense Assistant. I can help you track expenses, query monthly summaries, view breakdowns, or manage transactions. Try saying:\n- 'Add Rs. 350 for Uber under Travel'\n- 'Show my monthly summary'\n- 'Show category breakdown'";
}

export async function processChatMessage(
  userId: string,
  userMessage: string,
  history: { sender: 'user' | 'model'; text: string }[],
  token: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.log('No GEMINI_API_KEY found, running mock rule-based chat handler');
    return handleMockChat(userMessage, token);
  }

  try {
    const ai = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      tools: expenseTools as any,
      systemInstruction: 'You are a helpful and friendly AI assistant. You can chat about anything, answer general questions, or write jokes. If the user wants to manage their expenses, use your tools.\n\nCRITICAL CONVERSATIONAL RULES FOR UPDATING & DELETING EXPENSES:\n1. Users do not know their database expense IDs. If the user asks to UPDATE or DELETE an expense (e.g. "change my pizza expense to Rs. 150", "delete my coffee expense") and does not provide an ID, you MUST first run the `get_expenses` tool (WITHOUT passing any month parameter, to fetch all expenses) to retrieve the list. DO NOT ask the user for a month or date first.\n2. Look at the retrieved expenses in your context. Filter them by description/category/amount to find matching items.\n3. If EXACTLY ONE matching expense is found, extract its `_id` and use it immediately to invoke `update_expense` or `delete_expense` in the same turn.\n4. If MULTIPLE matching expenses are found, present the matches to the user (listing their descriptions, categories, amounts, and dates) and ask them to specify which one they want to change/delete.\n5. If NO matching expenses are found, politely inform the user you could not find the expense and ask for more details.',
    });

    // Format chat history for Gemini API
    const contents = history.map((h) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: userMessage }] });

    // Inject system instructions if necessary (Gemini system instruction can be passed as config)
    const chat = model.startChat({
      history: contents.slice(0, -1), // feed previous history
      generationConfig: {
        maxOutputTokens: 1000,
      },
    });

    let result = await chat.sendMessage(userMessage);
    let functionCalls = result.response.functionCalls();

    // Resolve function calls in a loop if the model decides to use tools
    let loopCount = 0;
    while (functionCalls && functionCalls.length > 0 && loopCount < 5) {
      loopCount++;
      const toolResults: any[] = [];

      for (const call of functionCalls) {
        const { name, args } = call;
        console.log(`Gemini requested execution of tool: ${name} with args:`, args);
        
        // Execute tool call via MCP
        const resultVal = await executeMcpTool(name, args, token);
        
        toolResults.push({
          functionResponse: {
            name: name,
            response: typeof resultVal === 'object' && resultVal !== null ? resultVal : { result: resultVal }
          },
        });
      }

      // Send the tool results back to the model to get a final conversational response
      result = await chat.sendMessage(toolResults as any);
      functionCalls = result.response.functionCalls();
    }

    return result.response.text() || "Sorry, I couldn't formulate a response.";
  } catch (error: any) {
    console.error('Gemini chat processing error:', error);
    return `Error: ${error.message}. Falling back to rules... \n\n` + (await handleMockChat(userMessage, token));
  }
}

// AI categorization helper based on custom notes
export async function categorizeExpenseWithAI(
  amount: number,
  originalDesc: string,
  note: string
): Promise<{ category: string; description: string }> {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const prompt = `
You are a helpful financial helper.
The user has an auto-logged transaction of amount Rs. ${amount} from SMS.
They have provided a note describing what they spent this money on: "${note}".

Based on the note, determine:
1. The correct category. It MUST be exactly one of: Food, Travel, Shopping, Bills, Other.
2. A clean, friendly, and concise description (e.g. if the note is "pizza", the description should be "Pizza". If the note is "taxi home", the description should be "Taxi Ride". If the note is "rent", the description should be "Rent").

Respond ONLY with a JSON object in this format:
{
  "category": "Food | Travel | Shopping | Bills | Other",
  "description": "Cleaned description string"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);
    return {
      category: ['Food', 'Travel', 'Shopping', 'Bills', 'Other'].includes(parsed.category) ? parsed.category : 'Other',
      description: parsed.description || note || originalDesc,
    };
  } catch (e) {
    console.error('Error categorizing expense with AI:', e);
    return { category: 'Other', description: note || originalDesc };
  }
}
