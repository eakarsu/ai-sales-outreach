import axios from 'axios';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export const callOpenRouter = async (
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{ content: string; tokensUsed: number }> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

  if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
    throw new Error('OpenRouter API key not configured');
  }

  try {
    const response = await axios.post<OpenRouterResponse>(
      OPENROUTER_API_URL,
      {
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'AI Sales Outreach Platform',
        },
      }
    );

    const content = response.data.choices[0]?.message?.content || '';
    const tokensUsed = response.data.usage?.total_tokens || 0;

    return { content, tokensUsed };
  } catch (error: any) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error?.message || 'Failed to call OpenRouter API');
  }
};

// Email Generation Prompts
export const generateEmailPrompt = (type: string, context: any): ChatMessage[] => {
  const systemPrompt = `You are an expert sales copywriter who creates highly effective, personalized sales emails.
Your emails are:
- Concise and respect the reader's time (under 150 words for the body)
- Personalized based on the provided context
- Value-focused, not feature-focused
- Have a clear, single call-to-action
- Professional but conversational in tone
- Never pushy or salesy

Always respond in JSON format with "subject" and "body" fields.`;

  const typeDescriptions: Record<string, string> = {
    cold_outreach: 'a cold outreach email to someone who has never heard of our company',
    follow_up: 'a follow-up email after no response to a previous outreach',
    meeting_request: 'an email requesting a meeting/demo call',
    personalized: 'a highly personalized email based on a specific trigger or event',
  };

  const userPrompt = `Write ${typeDescriptions[type] || typeDescriptions.cold_outreach}.

Context:
- Recipient's first name: ${context.firstName || 'the recipient'}
- Company: ${context.company || 'their company'}
- Industry: ${context.industry || 'their industry'}
${context.topic ? `- Relevant topic/trigger: ${context.topic}` : ''}

Our product: AI-powered sales outreach platform that helps sales teams personalize emails at scale, increase response rates, and book more meetings.

Respond ONLY with valid JSON in this exact format:
{"subject": "your subject line here", "body": "your email body here"}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// Subject Line Generation Prompts
export const generateSubjectLinesPrompt = (context: any, count: number): ChatMessage[] => {
  const systemPrompt = `You are an expert at writing email subject lines that get opened.
Your subject lines are:
- Under 50 characters when possible
- Create curiosity or offer clear value
- Personalized when context allows
- Never clickbait or misleading
- Varied in approach (questions, statements, personalization, etc.)

Always respond in JSON format with a "subjectLines" array.`;

  const userPrompt = `Generate ${count} different email subject lines for a sales outreach email.

Context:
- Target company: ${context.company || 'a potential customer'}
${context.firstName ? `- Recipient name: ${context.firstName}` : ''}
${context.trigger ? `- Relevant trigger/event: ${context.trigger}` : ''}

Our product: AI-powered sales outreach platform.

Respond ONLY with valid JSON in this exact format:
{"subjectLines": ["subject 1", "subject 2", "subject 3", "subject 4", "subject 5"]}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// Email Analysis Prompts
export const analyzeEmailPrompt = (subject: string, body: string): ChatMessage[] => {
  const systemPrompt = `You are an expert email analyst who evaluates sales emails for effectiveness.
Analyze emails based on:
- Subject line effectiveness (curiosity, clarity, length)
- Opening hook strength
- Value proposition clarity
- Personalization level
- Call-to-action clarity
- Overall length and readability
- Tone appropriateness

Provide scores from 0-100 and specific, actionable feedback.
Always respond in JSON format.`;

  const userPrompt = `Analyze this sales email:

Subject: ${subject}

Body:
${body}

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": 75,
  "subjectScore": 80,
  "bodyScore": 70,
  "readability": "Good",
  "estimatedOpenRate": "25.5",
  "estimatedReplyRate": "8.2",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "positives": ["positive 1", "positive 2", "positive 3"]
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// Email Improvement Prompts
export const improveEmailPrompt = (subject: string, body: string, improvements: string[]): ChatMessage[] => {
  const systemPrompt = `You are an expert sales copywriter who improves existing sales emails.
Make targeted improvements while maintaining the original message's intent and voice.
Always respond in JSON format with "subject" and "body" fields.`;

  const improvementDescriptions = improvements.map(imp => {
    switch (imp) {
      case 'shorter': return 'Make it more concise (reduce by 30-40%)';
      case 'more_personal': return 'Add more personalization and warmth';
      case 'add_social_proof': return 'Add relevant social proof or credibility markers';
      case 'stronger_cta': return 'Make the call-to-action clearer and more compelling';
      case 'better_subject': return 'Improve the subject line for higher open rates';
      default: return imp;
    }
  }).join('\n- ');

  const userPrompt = `Improve this sales email with the following changes:
- ${improvementDescriptions}

Original Subject: ${subject}

Original Body:
${body}

Respond ONLY with valid JSON in this exact format:
{"subject": "improved subject line", "body": "improved email body"}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};
