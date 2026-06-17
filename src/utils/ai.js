// Pollinations.ai API integration (free, no auth)
const AI_BASE = 'https://text.pollinations.ai';

async function askAI(prompt, systemPrompt = '', seed = 42) {
  try {
    const url = `${AI_BASE}/${encodeURIComponent(prompt.slice(0, 800))}?model=openai&system=${encodeURIComponent(systemPrompt.slice(0, 600))}&seed=${seed}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`AI error: ${response.status}`);
    return await response.text();
  } catch (e) {
    console.error('AI error:', e);
    return null;
  }
}

// ── System prompts ─────────────────────────────
const NORMAL_SYSTEM = `당신은 친근한 개인 비서입니다. 짧고 명확하게 한국어로 응답하세요.`;

const COUNSELOR_SYSTEM = `당신은 따뜻하고 공감적인 심리상담사입니다.
사용자를 '님'으로 부르고, 부드럽고 수용적인 언어를 사용하세요.
짧고 따뜻하게 응답하며, 이모지를 적절히 사용하세요.`;

// ── Task classification ────────────────────────
export async function classifyTasks(memoContents) {
  if (!memoContents?.length) return [];
  const systemPrompt = `할 일 목록을 분석해 JSON 배열만 출력하세요(설명 없이):
[{"id":"원본id","priority":"high|mid|low","category":"업무|개인|건강|가족|쇼핑|기타","tags":["태그"]}]
high=긴급/중요, mid=보통, low=여유`;
  const prompt = `분류: ${JSON.stringify(memoContents.slice(0, 10))}`;
  const result = await askAI(prompt, systemPrompt);
  if (!result) return [];
  try {
    const m = result.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]) : [];
  } catch { return []; }
}

// ── Morning briefing ───────────────────────────
export async function generateMorningBriefing(tasks, counselorMode = false) {
  if (!tasks?.length) return counselorMode
    ? '오늘 하루도 천천히, 자신의 속도로 시작해보세요 😊 등록된 할 일이 없으니 여유로운 하루가 될 것 같아요.'
    : '오늘은 등록된 할 일이 없어요. 여유로운 하루 보내세요! ☀️';

  const system = counselorMode ? COUNSELOR_SYSTEM : NORMAL_SYSTEM;
  const extra = counselorMode ? '따뜻하고 공감적인 말투로 3문장 이내로 작성하세요.' : '2-3문장으로 간결하게 작성하세요.';
  const systemPrompt = `${system}\n오늘의 할 일 목록을 보고 아침 브리핑을 작성하세요. ${extra}`;
  const prompt = `할 일: ${tasks.map(t => t.content).join(', ')}`;
  const result = await askAI(prompt, systemPrompt, 10);
  return result || (counselorMode
    ? `오늘 ${tasks.length}가지 일을 함께 해봐요 💪 하나씩 차근차근 해내실 수 있어요 😊`
    : `오늘 ${tasks.length}개의 할 일이 있어요. 화이팅! 💪`);
}

// ── Weekly report ──────────────────────────────
export async function generateWeeklyReport(data, counselorMode = false) {
  const { doneTasks, totalTasks, topEmotions, topKeywords } = data;
  const system = counselorMode ? COUNSELOR_SYSTEM : NORMAL_SYSTEM;
  const systemPrompt = `${system}\n이번 주 데이터를 보고 따뜻한 주간 회고 보고서를 3-4문장으로 작성하세요.`;
  const prompt = `완료: ${doneTasks}/${totalTasks}개, 감정: ${topEmotions.join(', ')}, 키워드: ${topKeywords.join(', ')}`;
  const result = await askAI(prompt, systemPrompt, 77);
  return result || `이번 주 ${doneTasks}개의 할 일을 완료하셨어요! 수고하셨어요 🌟`;
}

// ── Pattern analysis ───────────────────────────
const PATTERN_KEYWORDS = {
  '피로': ['피곤', '지침', '힘들', '졸려', '피로', '지쳐', '노곤'],
  '스트레스': ['화남', '짜증', '스트레스', '열받', '답답', '화가'],
  '우울': ['슬프', '우울', '힘들', '외로', '무기력', '슬픔'],
  '불안': ['불안', '걱정', '두려', '긴장', '초조'],
};

export function analyzePatterns(memos) {
  const now = new Date();
  const patterns = {};

  // 최근 7일 메모만 분석
  const recent = memos.filter(m => {
    const d = new Date(m.createdAt);
    return (now - d) < 7 * 24 * 60 * 60 * 1000;
  });

  recent.forEach(m => {
    const text = m.content.toLowerCase();
    const hour = new Date(m.createdAt).getHours();
    const dateStr = new Date(m.createdAt).toDateString();

    Object.entries(PATTERN_KEYWORDS).forEach(([patternName, keywords]) => {
      if (keywords.some(k => text.includes(k))) {
        if (!patterns[patternName]) patterns[patternName] = {};
        if (!patterns[patternName][dateStr]) patterns[patternName][dateStr] = [];
        patterns[patternName][dateStr].push(hour);
      }
    });
  });

  // 3일 이상 같은 패턴이면 알림 생성
  const alerts = [];
  Object.entries(patterns).forEach(([patternName, byDate]) => {
    const dates = Object.keys(byDate);
    if (dates.length >= 3) {
      const hours = Object.values(byDate).flat();
      const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
      alerts.push({ pattern: patternName, days: dates.length, avgHour });
    }
  });

  return alerts;
}

export async function generatePatternMessage(alert, counselorMode = false) {
  const system = counselorMode ? COUNSELOR_SYSTEM : NORMAL_SYSTEM;
  const systemPrompt = `${system}\n발견된 감정 패턴을 알리는 짧은 메시지(2문장)와 도움 제안을 작성하세요.`;
  const prompt = `패턴: ${alert.days}일 연속 '${alert.pattern}' 관련 내용. 평균 ${alert.avgHour}시.`;
  const result = await askAI(prompt, systemPrompt, 99);
  const defaultMsg = `지난 ${alert.days}일간 "${alert.pattern}" 관련 내용이 자주 등장했어요. 잠시 쉬는 건 어떨까요? 💪`;
  return result || defaultMsg;
}

// ── Extract tasks from text ────────────────────
export async function extractTasksFromText(text) {
  const systemPrompt = `메모에서 할 일만 추출. JSON 배열만: ["할일1","할일2"] 없으면 []`;
  const result = await askAI(text, systemPrompt, 1);
  if (!result) return [];
  try {
    const m = result.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]) : [];
  } catch { return []; }
}
