import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AGENT_TOOLS } from '@/lib/agent/tools';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

const SYSTEM_PROMPT = `You are an AI agent operating inside YoonOS, a web-based operating system. You have access to five apps: Browser, Calendar, Photo Booth, Text Edit, and System Settings.

When given a task:
1. Break it into logical steps.
2. Use the appropriate tools to complete each step.
3. Always open an app before interacting with it.
4. After navigating the browser to a URL, always call get_browser_content to read what is on the page before drawing conclusions.
5. When you are done, provide a brief, friendly summary of what you accomplished.

Today's date is ${new Date().toISOString().split('T')[0]}.

Be efficient. Do not repeat steps. Do not ask clarifying questions — make a reasonable assumption and proceed.`;

type PlanBranch = {
  id?: string;
  title: string;
  summary: string;
  tradeoff: string;
};

type PlannerResult = {
  branches: PlanBranch[];
  selectedIndex: number;
  rationale: string;
};

type ApprovedPlan = Required<PlanBranch>;

function extractJsonObject(text: string): string | null {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  return text.slice(firstBrace, lastBrace + 1);
}

function normalizePlannerResult(value: unknown): PlannerResult | null {
  if (!value || typeof value !== 'object') return null;

  const data = value as {
    branches?: unknown;
    selectedIndex?: unknown;
    rationale?: unknown;
  };

  if (!Array.isArray(data.branches)) return null;

  const branches = data.branches
    .map((branch) => {
      if (!branch || typeof branch !== 'object') return null;
      const item = branch as Record<string, unknown>;
      const title = typeof item.title === 'string' ? item.title : '';
      const summary = typeof item.summary === 'string' ? item.summary : '';
      const tradeoff = typeof item.tradeoff === 'string' ? item.tradeoff : '';
      if (!title || !summary) return null;
      return { title, summary, tradeoff };
    })
    .filter((branch): branch is PlanBranch => branch !== null)
    .slice(0, 3);

  if (branches.length < 3) return null;

  const selectedIndex =
    typeof data.selectedIndex === 'number' &&
    Number.isInteger(data.selectedIndex) &&
    data.selectedIndex >= 0 &&
    data.selectedIndex < branches.length
      ? data.selectedIndex
      : 0;

  return {
    branches,
    selectedIndex,
    rationale:
      typeof data.rationale === 'string' && data.rationale
        ? data.rationale
        : 'Selected as the most appropriate plan for this task.',
  };
}

function fallbackPlannerResult(task: string): PlannerResult {
  return {
    branches: [
      {
        title: 'Direct execution',
        summary: `Complete the task directly: ${task}`,
        tradeoff: 'Fastest path with minimal exploration.',
      },
      {
        title: 'Careful execution',
        summary: 'Inspect the current state, then proceed with the safest likely action.',
        tradeoff: 'Adds a little overhead to reduce mistakes.',
      },
      {
        title: 'Exploratory execution',
        summary: 'Look for adjacent context and alternatives before acting.',
        tradeoff: 'Best for ambiguous tasks, but may be slower.',
      },
    ],
    selectedIndex: 1,
    rationale: 'A careful path is the best default when the task may affect app state.',
  };
}

async function createPlannerResult(
  client: Anthropic,
  task: string
): Promise<PlannerResult> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:
        'You create divergent execution plans for an AI operating inside YoonOS. Always produce exactly three candidate branches, even for simple tasks, then select the best default branch. Return only valid JSON.',
      messages: [
        {
          role: 'user',
          content: `Task: ${task}

Return this exact JSON shape:
{
  "branches": [
    { "title": "short name", "summary": "what this branch would do", "tradeoff": "main benefit or risk" }
  ],
  "selectedIndex": 0,
  "rationale": "why this branch should execute"
}`,
        },
      ],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const json = extractJsonObject(text);
    if (!json) return fallbackPlannerResult(task);

    const parsed = normalizePlannerResult(JSON.parse(json));
    return parsed ?? fallbackPlannerResult(task);
  } catch {
    return fallbackPlannerResult(task);
  }
}

function getProxyBaseUrl(request: NextRequest): string {
  const envProxy = process.env.NEXT_PUBLIC_PROXY_BASE_URL || '';
  const pointsToLocalProxy = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envProxy);

  if (pointsToLocalProxy) {
    return `${request.nextUrl.origin}/api/browser`;
  }

  return envProxy || `${request.nextUrl.origin}/api/browser`;
}

async function fetchBrowserContent(url: string, proxyBaseUrl: string): Promise<string> {
  try {
    const res = await fetch(
      `${proxyBaseUrl}/content?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!res.ok) return `Error fetching content: HTTP ${res.status}`;
    const data = await res.json();
    return data.content || '(No content extracted)';
  } catch (err) {
    return `Error fetching content: ${(err as Error).message}`;
  }
}

export async function POST(req: NextRequest) {
  const proxyBaseUrl = getProxyBaseUrl(req);
  let userId = '';

  if (isSupabaseConfigured) {
    const supabase = createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    userId = session.user.id;
  }

  const { task, conversationHistory, currentBrowserUrl, approvedPlan } = await req.json();

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const messages: Anthropic.MessageParam[] = [
    ...(conversationHistory || []),
    { role: 'user' as const, content: task },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          // stream closed
        }
      };

      let browserUrl = currentBrowserUrl || '';

      try {
        let nextToolParentNodeId: string | undefined;
        const approvedBranch =
          approvedPlan &&
          typeof approvedPlan === 'object' &&
          typeof approvedPlan.id === 'string' &&
          typeof approvedPlan.title === 'string' &&
          typeof approvedPlan.summary === 'string'
            ? ({
                id: approvedPlan.id,
                title: approvedPlan.title,
                summary: approvedPlan.summary,
                tradeoff:
                  typeof approvedPlan.tradeoff === 'string' ? approvedPlan.tradeoff : '',
              } as ApprovedPlan)
            : null;

        if (approvedBranch) {
          nextToolParentNodeId = approvedBranch.id;
          send({
            type: 'graph_node',
            nodeId: approvedBranch.id,
            label: approvedBranch.title,
            toolName: 'selected_plan',
            input: {
              summary: approvedBranch.summary,
              tradeoff: approvedBranch.tradeoff,
            },
            status: 'done',
            output: 'Approved for execution.',
          });
          messages.push({
            role: 'user',
            content: `Proceed using the approved execution branch "${approvedBranch.title}": ${approvedBranch.summary}`,
          });
        } else {
          const plannerResult = await createPlannerResult(client, task);
          const runId = crypto.randomUUID();
          const rootNodeId = `task-${runId}`;
          const branchNodeIds = plannerResult.branches.map((_, index) => `plan-${runId}-${index}`);
          const recommendedBranchId = branchNodeIds[plannerResult.selectedIndex];

          send({
            type: 'graph_node',
            nodeId: rootNodeId,
            label: task,
            toolName: 'task',
            input: { task },
            status: 'done',
            output: 'Task received. Generated candidate plans for approval.',
          });

          const branches = plannerResult.branches.map((branch, index) => ({
            id: branchNodeIds[index],
            title: branch.title,
            summary: branch.summary,
            tradeoff: branch.tradeoff,
          }));

          branches.forEach((branch) => {
            const isRecommended = branch.id === recommendedBranchId;

            send({
              type: 'graph_node',
              nodeId: branch.id,
              label: branch.title,
              toolName: isRecommended ? 'recommended_plan' : 'candidate_plan',
              input: {
                summary: branch.summary,
                tradeoff: branch.tradeoff,
              },
              status: 'pending',
              output: isRecommended
                ? `Recommended. ${plannerResult.rationale}`
                : 'Alternative branch awaiting approval.',
            });
            send({ type: 'graph_edge', sourceId: rootNodeId, targetId: branch.id });
          });

          send({
            type: 'planner_ready',
            branches,
            recommendedBranchId,
            rationale: plannerResult.rationale,
          });
          return;
        }

        let continueLoop = true;
        let iterations = 0;
        const MAX_ITERATIONS = 30;

        while (continueLoop && iterations < MAX_ITERATIONS) {
          iterations++;

          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages,
          });

          const toolCalls = response.content.filter(
            (b): b is Anthropic.ContentBlock & { type: 'tool_use' } => b.type === 'tool_use'
          );
          const textBlocks = response.content.filter(
            (b): b is Anthropic.TextBlock => b.type === 'text'
          );

          for (const block of textBlocks) {
            send({ type: 'text', content: block.text });
          }

          if (response.stop_reason === 'end_turn' || toolCalls.length === 0) {
            continueLoop = false;
            send({ type: 'done' });
            break;
          }

          messages.push({ role: 'assistant', content: response.content });

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const toolUse of toolCalls) {
            const input = toolUse.input as Record<string, unknown>;

            send({
              type: 'tool_start',
              toolCallId: toolUse.id,
              toolName: toolUse.name,
              input,
              parentNodeId: nextToolParentNodeId,
            });
            nextToolParentNodeId = undefined;

            let result = '';

            try {
              if (toolUse.name === 'get_browser_content') {
                if (browserUrl) {
                  result = await fetchBrowserContent(browserUrl, proxyBaseUrl);
                } else {
                  result = '(No page loaded in browser. Navigate to a URL first.)';
                }
              } else if (toolUse.name === 'navigate_browser') {
                browserUrl = (input.url as string) || '';
                result = JSON.stringify({ status: 'ok', navigated_to: browserUrl });
              } else if (toolUse.name === 'read_user_file') {
                const fileName = input.file_name as string;
                if (!isSupabaseConfigured || !userId) {
                  result = 'File reading requires Supabase to be configured.';
                } else {
                  const sb = createSupabaseServerClient();
                  const { data: fileData, error: fileError } = await sb
                    .from('files')
                    .select('name, content')
                    .eq('user_id', userId)
                    .ilike('name', `%${fileName}%`)
                    .limit(1)
                    .single();
                  if (fileError || !fileData) {
                    result = `No file found matching "${fileName}".`;
                  } else {
                    result = `File: ${fileData.name}\n\n${fileData.content}`;
                  }
                }
              } else {
                result = JSON.stringify({ status: 'ok', tool: toolUse.name, input });
              }

              send({ type: 'tool_done', toolCallId: toolUse.id, output: result });
            } catch (err) {
              result = `Error: ${(err as Error).message}`;
              send({ type: 'tool_error', toolCallId: toolUse.id, error: result });
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result,
            });
          }

          messages.push({ role: 'user', content: toolResults });
        }

        if (iterations >= MAX_ITERATIONS) {
          send({ type: 'text', content: '\n\n(Reached maximum iterations. Stopping.)' });
          send({ type: 'done' });
        }
      } catch (err) {
        send({ type: 'error', message: (err as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
