// Pollinations.ai API integration (free, no auth needed)
// https://text.pollinations.ai/

const AI_BASE = 'https://text.pollinations.ai';

async function askAI(prompt, systemPrompt = '') {
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    // Encode for URL
    const encoded = encodeURIComponent(JSON.stringify(messages));
    const url = `${AI_BASE}/${encodeURIComponent(prompt)}?model=openai&system=${encodeURIComponent(systemPrompt)}&seed=42`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    return await response.text();
  } catch (e) {
    console.error('AI error:', e);
    return null;
  }
}

// Organize and classify tasks from memos
export async function classifyTasks(memoContents) {
  if (!memoContents || memoContents.length === 0) return [];

  const systemPrompt = `당신은 할 일 목록을 분석하는 AI입니다.
각 메모를 분석해서 다음 형식의 JSON 배열로만 응답하세요(설명 없이):
[{"id":"원본id","priority":"high|mid|low","category":"업무|개인|건강|가족|쇼핑|기타","tags":["태그1","태그2"]}]
우선순위: high=긴급하거나 중요, mid=보통, low=여유있음`;

  const prompt = `다음 메모들을 분류해주세요:\n${JSON.stringify(memoContents)}`;

  const result = await askAI(prompt, systemPrompt);
  if (!result) return [];

  try {
    // Extract JSON from response
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Parse error:', e);
  }
  return [];
}

// Generate morning briefing summary
export async function generateMorningBriefing(tasks) {
  if (!tasks || tasks.length === 0) {
    return '오늘은 등록된 할 일이 없어요. 여유로운 하루 보내세요! ☀️';
  }

  const systemPrompt = `당신은 친근한 개인 비서입니다.
오늘의 할 일 목록을 보고 짧고 따뜻한 아침 브리핑 메시지를 작성하세요.
2-3문장으로 간결하게, 한국어로 작성하세요.`;

  const prompt = `오늘의 할 일 목록: ${tasks.map(t => t.content).join(', ')}`;

  const result = await askAI(prompt, systemPrompt);
  return result || `오늘 ${tasks.length}개의 할 일이 있어요. 화이팅! 💪`;
}

// Extract tasks from free text memo
export async function extractTasksFromText(text) {
  const systemPrompt = `메모 텍스트에서 할 일 목록을 추출하세요.
JSON 배열로만 응답: ["할일1", "할일2", ...]
할 일이 없으면 빈 배열: []`;

  const result = await askAI(text, systemPrompt);
  if (!result) return [];

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {
    return [];
  }
  return [];
}
