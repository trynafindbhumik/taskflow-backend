import { ServiceUnavailableError } from '../../errors/AppError';

export interface LLMToolChoice {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  reply: string;
  toolCalls?: LLMToolChoice[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const DEFAULT_TOOLS: ToolDefinition[] = [
  {
    name: 'create_project',
    description: 'Creates a new project in TaskFlow',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Title of the project' },
        description: { type: 'string', description: 'Detailed description of the project' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_task',
    description: 'Creates a single new task in a project. DO NOT use this tool multiple times in a row for bulk creation. For planning multiple tasks, use generate_project_proposal instead.',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name of the project' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        assignee_name: { type: 'string', description: 'Assignee name or email' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
        subtasks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Subtask titles',
        },
      },
      required: ['project_name', 'title'],
    },
  },
  {
    name: 'get_project_progress_stats',
    description: 'Calculates total tasks, completed count, and progress percentages',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Project name or ALL' },
      },
    },
  },
  {
    name: 'get_overdue_tasks_report',
    description: 'Identifies overdue tasks across projects with bottleneck severity analysis',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Optional project scope filter' },
      },
    },
  },
  {
    name: 'get_team_workload_summary',
    description: 'Analyzes team task distribution and member capacities (Overloaded, Optimal, Available)',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Optional project scope filter' },
      },
    },
  },
  {
    name: 'generate_project_proposal',
    description: 'Generates a structured implementation plan with tasks, subtasks, priorities, and deadlines from user prompt or requirement PDF',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Project title' },
        description: { type: 'string', description: 'Project description' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              due_date: { type: 'string' },
              subtasks: { type: 'array', items: { type: 'string' } },
            },
            required: ['title'],
          },
        },
      },
      required: ['project_name', 'tasks'],
    },
  },
  {
    name: 'refine_project_proposal',
    description: 'Performs targeted fine-grained modifications on an existing implementation plan (e.g. changing a single task deadline, adding a subtask, updating priority) without regenerating unmodified tasks',
    parameters: {
      type: 'object',
      properties: {
        proposal_id: { type: 'string', description: 'ID of existing draft proposal' },
        modifications: { type: 'string', description: 'Description of the specific change requested' },
        target_task_title: { type: 'string', description: 'Title or index of the specific task being modified' },
        updated_fields: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            due_date: { type: 'string' },
            subtasks: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
  {
    name: 'update_task',
    description: 'Updates task fields in TaskFlow database such as due_date, status, priority, or assignee',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'ID or title snippet of task' },
        task_title: { type: 'string', description: 'Exact or partial title of task' },
        due_date: { type: 'string', description: 'New due date in YYYY-MM-DD format' },
        status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        assignee_name: { type: 'string', description: 'Assignee user name or email' },
      },
    },
  },
  {
    name: 'send_notification',
    description: 'Sends an in-app notification to a team member or task assignee',
    parameters: {
      type: 'object',
      properties: {
        recipient_name: { type: 'string', description: 'Name or email of team member recipient' },
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Detailed notification text' },
      },
      required: ['recipient_name', 'title', 'message'],
    },
  },
  {
    name: 'add_project_member',
    description: 'Invites or adds a member to a project by email',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name or ID of project' },
        email: { type: 'string', description: 'Email address of member to add' },
      },
      required: ['project_name', 'email'],
    },
  },
  {
    name: 'remove_project_member',
    description: 'Removes a member from a project. If multiple members match the query (e.g. multiple people named Ayush), AI must specify which one by listing full names and emails.',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name or ID of project' },
        member_query: { type: 'string', description: 'Name or email of member to remove' },
        confirmed_user_id: { type: 'string', description: 'Exact User ID once disambiguated or confirmed' },
      },
      required: ['project_name', 'member_query'],
    },
  },
  {
    name: 'get_project_details',
    description: 'Fetches complete details of a project including owner, members, tasks, and subtasks',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name or ID of project' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'update_project',
    description: 'Updates project title or description. Requires user confirmation before executing changes.',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Current name or ID of project' },
        new_name: { type: 'string', description: 'New project name' },
        description: { type: 'string', description: 'New project description' },
        confirmed: { type: 'boolean', description: 'True if user explicitly confirmed the edit decision' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'delete_project',
    description: 'Deletes an entire project and its tasks. REQUIRES EXPLICIT USER CONFIRMATION before deletion.',
    parameters: {
      type: 'object',
      properties: {
        project_name: { type: 'string', description: 'Name or ID of project to delete' },
        confirmed: { type: 'boolean', description: 'True if user explicitly confirmed the deletion decision' },
      },
      required: ['project_name'],
    },
  },
  {
    name: 'delete_task',
    description: 'Deletes a specific task. REQUIRES EXPLICIT USER CONFIRMATION before deletion.',
    parameters: {
      type: 'object',
      properties: {
        task_title: { type: 'string', description: 'Title or ID of task' },
        project_name: { type: 'string', description: 'Project name if known' },
        confirmed: { type: 'boolean', description: 'True if user explicitly confirmed deletion' },
      },
      required: ['task_title'],
    },
  },
  {
    name: 'delete_subtask',
    description: 'Deletes a specific subtask. REQUIRES EXPLICIT USER CONFIRMATION before deletion.',
    parameters: {
      type: 'object',
      properties: {
        subtask_title: { type: 'string', description: 'Title or ID of subtask' },
        task_title: { type: 'string', description: 'Parent task title if known' },
        confirmed: { type: 'boolean', description: 'True if user explicitly confirmed deletion' },
      },
      required: ['subtask_title'],
    },
  },
];

export class LLMProvider {
  /**
   * Dispatches chat request to the configured AI provider (.env).
   * Throws ServiceUnavailableError if AI_API_KEY is missing.
   */
  static async chat(
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<LLMResponse> {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
    const apiKey = (process.env.AI_API_KEY || '').trim();
    const model = (process.env.AI_MODEL || '').trim();
    const baseUrl = (process.env.AI_BASE_URL || '').trim();

    if (!apiKey && provider !== 'ollama') {
      throw new ServiceUnavailableError(
        `AI Service not configured. Please set AI_API_KEY in backend .env for provider "${provider}".`
      );
    }

    if (provider === 'gemini') {
      return this.callGemini(apiKey, model || 'gemini-1.5-flash', systemPrompt, userPrompt, history);
    }

    // Universal OpenAI-compatible endpoint handler (OpenAI, Groq, Mistral, MiniMax, Ollama, Custom)
    return this.callOpenAICompatible(
      provider,
      apiKey,
      model,
      baseUrl,
      systemPrompt,
      userPrompt,
      history
    );
  }

  private static async callGemini(
    apiKey: string,
    modelName: string,
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: string; content: string }>
  ): Promise<LLMResponse> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const contents = [];
    contents.push({
      role: 'user',
      parts: [{ text: `System Instruction:\n${systemPrompt}` }],
    });

    for (const h of history) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });

    const bodyPayload = {
      contents,
      tools: [
        {
          functionDeclarations: DEFAULT_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ],
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API Error (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as Record<string, any>;
    const candidate = data.candidates?.[0]?.content;

    let reply = '';
    const toolCalls: LLMToolChoice[] = [];

    if (candidate?.parts) {
      for (const part of candidate.parts) {
        if (part.text) reply += part.text;
        if (part.functionCall) {
          toolCalls.push({
            name: part.functionCall.name,
            arguments: part.functionCall.args || {},
          });
        }
      }
    }

    return {
      reply: reply.trim() || 'I have processed your request and updated the workspace artifacts accordingly. Let me know if you need any further details!',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }

  private static async callOpenAICompatible(
    provider: string,
    apiKey: string,
    modelName: string,
    baseUrlOverride: string,
    systemPrompt: string,
    userPrompt: string,
    history: Array<{ role: string; content: string }>
  ): Promise<LLMResponse> {
    let endpoint = '';
    let defaultModel = 'gpt-4o-mini';

    if (baseUrlOverride) {
      endpoint = baseUrlOverride.endsWith('/chat/completions')
        ? baseUrlOverride
        : `${baseUrlOverride.replace(/\/+$/, '')}/chat/completions`;
    } else if (provider === 'openai') {
      endpoint = 'https://api.openai.com/v1/chat/completions';
      defaultModel = 'gpt-4o-mini';
    } else if (provider === 'groq') {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      defaultModel = 'llama-3.1-70b-versatile';
    } else if (provider === 'mistral') {
      endpoint = 'https://api.mistral.ai/v1/chat/completions';
      defaultModel = 'mistral-small-latest';
    } else if (provider === 'minimax') {
      endpoint = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
      defaultModel = 'abab6.5-chat';
    } else if (provider === 'ollama') {
      endpoint = 'http://localhost:11434/v1/chat/completions';
      defaultModel = 'llama3';
    } else {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    }

    const targetModel = modelName || defaultModel;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: userPrompt },
    ];

    const tools = DEFAULT_TOOLS.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const bodyPayload: Record<string, any> = {
      model: targetModel,
      messages,
      tools,
      tool_choice: 'auto',
      stream: false,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    const rawText = await res.text();

    if (!res.ok) {
      throw new Error(`${provider.toUpperCase()} API Error (${res.status}): ${rawText}`);
    }

    let data: Record<string, any>;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Robust handling for MiniMax or providers returning SSE data: lines
      const lines = rawText.split('\n');
      let combinedContent = '';
      const extractedToolCalls: LLMToolChoice[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data:') && !trimmedLine.includes('[DONE]')) {
          try {
            const jsonStr = trimmedLine.replace(/^data:\s*/, '');
            const parsedChunk = JSON.parse(jsonStr);
            const delta = parsedChunk.choices?.[0]?.delta || parsedChunk.choices?.[0]?.message;
            if (delta?.content) {
              combinedContent += delta.content;
            }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.function) {
                  let args = {};
                  try {
                    args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
                  } catch {}
                  extractedToolCalls.push({ name: tc.function.name, arguments: args });
                }
              }
            }
          } catch {}
        }
      }

      if (combinedContent || extractedToolCalls.length > 0) {
        return {
          reply: combinedContent.trim() || 'Request processed successfully.',
          toolCalls: extractedToolCalls.length > 0 ? extractedToolCalls : undefined,
        };
      }

      throw new Error(`Failed to parse response payload from ${provider.toUpperCase()}: ${rawText.slice(0, 200)}`);
    }

    const choice = data.choices?.[0]?.message;
    let reply = choice?.content || '';
    const toolCalls: LLMToolChoice[] = [];

    if (choice?.tool_calls && Array.isArray(choice.tool_calls)) {
      for (const tc of choice.tool_calls) {
        if (tc.function) {
          let parsedArgs = {};
          try {
            parsedArgs =
              typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments)
                : tc.function.arguments;
          } catch {}
          toolCalls.push({
            name: tc.function.name,
            arguments: parsedArgs,
          });
        }
      }
    }

    return {
      reply: reply.trim() || 'I have processed your request and updated the workspace artifacts accordingly. Let me know if you need any further details!',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}
