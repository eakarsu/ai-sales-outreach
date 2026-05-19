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

const OPENROUTER_TIMEOUT_MS = 30_000; // 30-second timeout

export class OpenRouterTimeoutError extends Error {
  constructor() {
    super('AI service timeout');
    this.name = 'OpenRouterTimeoutError';
  }
}

export const callOpenRouter = async (
  messages: ChatMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  }
): Promise<{ content: string; tokensUsed: number }> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
    throw new Error('OpenRouter API key not configured');
  }

  const timeoutMs = options?.timeoutMs ?? OPENROUTER_TIMEOUT_MS;

  try {
    const response = await axios.post<OpenRouterResponse>(
      OPENROUTER_API_URL,
      {
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1500,
      },
      {
        timeout: timeoutMs,
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
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      console.error('OpenRouter API timed out after', timeoutMs, 'ms');
      throw new OpenRouterTimeoutError();
    }
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

// AI Lead Scoring Prompt
export const scoreLeadPrompt = (contact: any): ChatMessage[] => {
  const systemPrompt = `You are an elite B2B sales intelligence AI with deep expertise in lead qualification, pipeline management, and revenue forecasting.

Your lead scoring methodology combines:
- BANT Framework (Budget, Authority, Need, Timeline)
- Engagement velocity and recency analysis
- Firmographic and technographic signals
- Behavioral intent patterns
- Industry-specific buying cycle analysis

You produce actionable, data-driven assessments that help sales teams prioritize their efforts for maximum revenue impact.

CRITICAL: You must respond with ONLY valid JSON. No markdown, no explanation text outside JSON.`;

  const openRate = contact.emailsSent > 0 ? Math.round((contact.emailsOpened / contact.emailsSent) * 100) : 0;
  const replyRate = contact.emailsSent > 0 ? Math.round((contact.replies / contact.emailsSent) * 100) : 0;

  const userPrompt = `Perform a comprehensive lead scoring analysis for this prospect:

=== CONTACT PROFILE ===
Name: ${contact.firstName} ${contact.lastName}
Email: ${contact.email}
Company: ${contact.company || 'Unknown'}
Job Title: ${contact.jobTitle || 'Unknown'}
Industry: ${contact.industry || 'Unknown'}
Lead Status: ${contact.status || 'new'}
Lead Source: ${contact.source || 'Unknown'}
Last Contacted: ${contact.lastContactedAt || 'Never'}
Current Score: ${contact.leadScore || 0}

=== ENGAGEMENT METRICS ===
Emails Sent: ${contact.emailsSent || 0}
Emails Opened: ${contact.emailsOpened || 0} (${openRate}% open rate)
Replies Received: ${contact.replies || 0} (${replyRate}% reply rate)
Meetings Held: ${contact.meetings || 0}

=== SCORING CRITERIA ===
Consider these factors when scoring:
1. Decision-making authority based on job title
2. Company fit and market potential
3. Engagement level and responsiveness
4. Where they are in the buying journey
5. Predicted deal value based on company size and industry

Score from 0-100 where:
- 80-100: Hot lead, ready to buy
- 60-79: Warm lead, actively evaluating
- 40-59: Interested but needs nurturing
- 0-39: Cold or unqualified

Set engagementLevel to one of: "hot", "warm", "engaged", "cool", "cold"

Respond ONLY with valid JSON:
{
  "score": 75,
  "confidence": 85.5,
  "engagementLevel": "warm",
  "buyingSignals": ["Signal 1", "Signal 2", "Signal 3"],
  "riskFactors": ["Risk 1", "Risk 2"],
  "nextBestAction": "Specific actionable next step for the sales rep",
  "predictedCloseDate": "2025-04-15",
  "predictedDealValue": 50000,
  "analysis": "Detailed 2-3 sentence analysis of this lead's potential and current position in the sales funnel...",
  "recommendation": "Clear, specific recommendation for how to approach this lead and what to prioritize..."
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// AI Personalization Prompt
export const generatePersonalizationPrompt = (contact: any, content: any): ChatMessage[] => {
  const systemPrompt = `You are a world-class sales personalization AI that transforms generic outreach into deeply relevant, compelling communications.

Your personalization approach:
- Research-driven: You infer company challenges from industry, role, and company context
- Empathy-first: You address the prospect's likely pain points before pitching solutions
- Specific over generic: Replace vague claims with role-relevant and industry-relevant specifics
- Conversational authority: Sound knowledgeable without being condescending
- Value-focused: Every sentence should answer "why should this person care?"

You create content that makes prospects think "they really understand my situation."

CRITICAL: You must respond with ONLY valid JSON. No markdown, no explanation text outside JSON.`;

  const userPrompt = `Transform the following content into a highly personalized version for this specific prospect:

=== PROSPECT PROFILE ===
Name: ${contact.firstName} ${contact.lastName}
Company: ${contact.company || 'Unknown'}
Job Title: ${contact.jobTitle || 'Unknown'}
Industry: ${contact.industry || 'Unknown'}

=== ORIGINAL CONTENT ===
${content.original || content}

=== PERSONALIZATION INSTRUCTIONS ===
Tone: ${content.tone || 'professional'}
Focus Area: ${content.focusArea || 'general value proposition'}

Make the content:
1. Reference their specific industry challenges and trends
2. Speak to their role's priorities and KPIs
3. Use language and terminology they would use
4. Address pain points relevant to their company size and sector
5. Include specific, measurable value propositions

Respond ONLY with valid JSON:
{
  "personalizedContent": "The fully personalized content with specific references to their role, industry, and company...",
  "tone": "${content.tone || 'professional'}",
  "industryContext": "A detailed paragraph about their industry's current challenges and how it relates to the outreach...",
  "companyInsights": "Specific insights about what a company like theirs likely deals with...",
  "roleSpecificPoints": ["Point relevant to their specific job title and responsibilities", "Another role-specific insight"],
  "painPoints": ["Specific pain point for their role/industry", "Another relevant challenge"],
  "valuePropositions": ["Specific measurable benefit", "Another concrete value prop"],
  "confidence": 88.5,
  "engagementPrediction": 75.0,
  "personalizationFactors": {
    "industry": true,
    "role": true,
    "company": true,
    "timing": false
  }
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// AI Best Time Predictor Prompt
export const predictBestTimePrompt = (contact: any, historicalData: any): ChatMessage[] => {
  const systemPrompt = `You are a sales timing optimization AI that combines behavioral science, industry research, and engagement analytics to predict the optimal outreach windows.

Your timing predictions are based on:
- Role-specific work patterns (e.g., executives check email early morning, managers mid-morning)
- Industry norms (e.g., finance professionals start early, creative roles start later)
- Day-of-week engagement research from B2B sales studies
- Historical engagement data when available
- Timezone-aware scheduling
- Meeting-heavy vs. focused-work time blocks by role

Your predictions help sales teams reach prospects when they're most receptive and likely to engage.

CRITICAL: You must respond with ONLY valid JSON. No markdown, no explanation text outside JSON.`;

  const hasHistory = historicalData?.emailsOpened?.length > 0 || historicalData?.repliesSent?.length > 0;

  const userPrompt = `Predict the optimal outreach timing for this prospect:

=== PROSPECT PROFILE ===
Name: ${contact.firstName} ${contact.lastName}
Company: ${contact.company || 'Unknown'}
Job Title: ${contact.jobTitle || 'Unknown'}
Industry: ${contact.industry || 'Unknown'}
Timezone: ${contact.timezone || 'America/New_York'}

=== HISTORICAL ENGAGEMENT DATA ===
${hasHistory ? JSON.stringify(historicalData, null, 2) : 'No prior engagement data available. Use industry and role-based predictions.'}

=== ANALYSIS REQUIREMENTS ===
1. Determine the best day of the week (Monday-Friday)
2. Identify a 2-hour optimal window within business hours
3. Consider their role's typical daily schedule
4. Factor in industry-specific patterns
5. Provide actionable avoid-times with reasoning
6. Suggest optimal follow-up frequency

Use "morning" (numeric, 0-100), "afternoon" (numeric, 0-100), "evening" (numeric, 0-100) for engagement patterns.

Respond ONLY with valid JSON:
{
  "bestDay": "Tuesday",
  "bestTimeStart": "09:00",
  "bestTimeEnd": "11:00",
  "timezone": "${contact.timezone || 'America/New_York'}",
  "confidence": 82.5,
  "reasoning": "Detailed explanation of why this time window is optimal for this specific prospect based on their role, industry, and any available data...",
  "engagementPatterns": {
    "morning": 75,
    "afternoon": 45,
    "evening": 20
  },
  "optimalFrequency": "Every 3-4 days",
  "avoidTimes": ["Monday mornings - executives in planning meetings", "Friday after 3pm - wind-down mode"],
  "industryInsights": "Detailed insight about this industry's communication patterns and how it affects outreach timing..."
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// AI Objection Handler Prompt
export const handleObjectionPrompt = (objection: string, context: any): ChatMessage[] => {
  const systemPrompt = `You are a master sales coach and objection handling expert with 20+ years of experience training top-performing B2B sales teams.

Your objection handling philosophy:
- Every objection is a buying signal in disguise - it means the prospect is engaged enough to push back
- Listen first, respond second - acknowledge their concern genuinely before reframing
- Use the "Feel, Felt, Found" framework when appropriate
- Tailor responses to the buyer's personality type and decision-making style
- Provide responses that maintain the relationship while advancing the deal
- Include specific talk tracks that sound natural, not scripted

You classify objections into: price, timing, competition, authority, need, trust, or status_quo.

CRITICAL: You must respond with ONLY valid JSON. No markdown, no explanation text outside JSON.`;

  const userPrompt = `Craft expert responses to handle this sales objection:

=== THE OBJECTION ===
"${objection}"

=== CONTEXT ===
Industry: ${context.industry || 'General'}
Buyer Persona: ${context.buyerPersona || 'Decision Maker'}
Sales Stage: ${context.salesStage || 'Discovery'}
Previous Interactions: ${context.previousInteractions || 'None'}

=== REQUIREMENTS ===
1. Classify the objection type
2. Provide an overarching response strategy
3. Create 3 distinct response templates with different approaches
4. Each response should be a complete, ready-to-use talk track (2-4 sentences)
5. Include follow-up questions to keep the conversation going
6. Identify related objections that often come after this one

Respond ONLY with valid JSON:
{
  "objectionType": "price",
  "responseStrategy": "Clear strategy explanation for handling this objection...",
  "responseTemplates": [
    {
      "approach": "Value Reframe",
      "response": "Complete, natural-sounding response that a sales rep can use word-for-word...",
      "tone": "empathetic",
      "effectiveness": 85
    },
    {
      "approach": "ROI Focus",
      "response": "Complete response with specific ROI angle...",
      "tone": "consultative",
      "effectiveness": 78
    },
    {
      "approach": "Question-Based",
      "response": "Complete response using strategic questions to uncover the real concern...",
      "tone": "curious",
      "effectiveness": 72
    }
  ],
  "relatedObjections": ["Related objection 1", "Related objection 2"],
  "followUpQuestions": ["Strategic follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "insights": "Deep psychological insight about what this objection really means and how top performers handle it...",
  "confidence": 88.0,
  "successRate": 72.5
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};

// AI Pipeline Forecaster Prompt
export const forecastPipelinePrompt = (pipelineData: any, historicalData: any): ChatMessage[] => {
  const systemPrompt = `You are a revenue operations AI specializing in sales pipeline forecasting and analysis.

Your forecasting methodology:
- Weighted pipeline analysis (probability-adjusted revenue)
- Historical conversion rate trending
- Stage velocity analysis (time-in-stage patterns)
- Deal concentration risk assessment
- Seasonal and market-aware adjustments
- Monte Carlo-inspired scenario modeling (best/likely/worst)

You produce forecasts that sales leaders can present to their board with confidence. Your analysis is data-driven, realistic, and actionable.

Pipeline health values: "Healthy", "Strong", "Growing", "Stable", "At Risk", "On Track"

CRITICAL: You must respond with ONLY valid JSON. No markdown, no explanation text outside JSON.`;

  const dealCount = pipelineData?.deals?.length || 0;
  const totalValue = pipelineData?.totalValue || 0;

  const userPrompt = `Generate a comprehensive sales pipeline forecast:

=== CURRENT PIPELINE ===
Total Pipeline Value: $${totalValue.toLocaleString()}
Active Deals: ${dealCount}
${dealCount > 0 ? `Deal Details:\n${JSON.stringify(pipelineData.deals, null, 2)}` : 'No active deals in pipeline.'}

=== HISTORICAL PERFORMANCE ===
Average Win Rate: ${historicalData?.averageWinRate || 25}%
Average Sales Cycle: ${historicalData?.averageCycleLength || 45} days

=== FORECAST PARAMETERS ===
Forecast Period: ${pipelineData.forecastPeriod || 'Next Quarter'}

=== REQUIREMENTS ===
1. Predict revenue using probability-weighted analysis
2. Assess pipeline health and concentration risk
3. Create 3 revenue scenarios (best/likely/worst)
4. Generate 2-3 realistic opportunities with names, values, probabilities
5. Provide 3-4 actionable recommendations
6. Write a detailed analysis paragraph

Respond ONLY with valid JSON:
{
  "forecastPeriod": "${pipelineData.forecastPeriod || 'Next Quarter'}",
  "predictedRevenue": 450000,
  "predictedDeals": 12,
  "confidence": 75.5,
  "pipelineHealth": "Healthy",
  "riskAssessment": "Detailed assessment of risks in the current pipeline...",
  "opportunities": [
    {"name": "Enterprise Deal A", "value": 150000, "probability": 75, "expectedClose": "2025-04-15"},
    {"name": "Mid-Market Deal B", "value": 85000, "probability": 60, "expectedClose": "2025-05-01"}
  ],
  "recommendations": [
    "First actionable recommendation",
    "Second actionable recommendation",
    "Third actionable recommendation"
  ],
  "analysis": "Comprehensive 3-4 sentence analysis of pipeline health, velocity, and outlook...",
  "factorsConsidered": {
    "dealStages": true,
    "historicalWinRates": true,
    "seasonalPatterns": true,
    "marketConditions": true
  },
  "scenarioBest": 580000,
  "scenarioLikely": 450000,
  "scenarioWorst": 280000
}`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
};
