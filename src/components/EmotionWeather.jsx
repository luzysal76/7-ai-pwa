export const WEATHERS = [
  { key: 'sunny',   emoji: '☀️', label: '맑음',  desc: '행복/활기', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  { key: 'cloudy',  emoji: '☁️', label: '흐림',  desc: '무기력/지침', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  { key: 'rainy',   emoji: '🌧️', label: '비',    desc: '슬픔/우울', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  { key: 'stormy',  emoji: '🌩️', label: '천둥',  desc: '화남/불안', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  { key: 'rainbow', emoji: '🌈', label: '무지개', desc: '설렘/희망', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
];

export function getWeather(key) {
  return WEATHERS.find(w => w.key === key) || null;
}

// Compact weather selector for home screen
export function WeatherWidget({ todayWeather, onSelect }) {
  const current = getWeather(todayWeather);

  return (
    <div
      className="mx-4 mb-3 p-3 rounded-2xl flex items-center gap-3"
      style={{
        background: current ? current.bg : 'rgba(255,255,255,0.04)',
        border: `1px solid ${current ? current.color + '40' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className="flex-1">
        <p className="text-xs text-slate-500 mb-1">오늘의 감정 날씨</p>
        <p className="text-sm font-medium" style={{ color: current ? current.color : '#475569' }}>
          {current ? `${current.emoji} ${current.label} — ${current.desc}` : '오늘 날씨를 선택하세요'}
        </p>
      </div>

      {/* Quick selector */}
      <div className="flex gap-1.5">
        {WEATHERS.map(w => (
          <button
            key={w.key}
            onClick={() => onSelect(w.key === todayWeather ? null : w.key)}
            className="text-xl transition-all"
            style={{
              opacity: todayWeather && todayWeather !== w.key ? 0.35 : 1,
              transform: todayWeather === w.key ? 'scale(1.3)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
          >
            {w.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// 30-day heatmap calendar
export function WeatherHeatmap({ last30Days }) {
  const weeks = [];
  let week = [];

  last30Days.forEach((day, i) => {
    week.push(day);
    if (week.length === 7 || i === last30Days.length - 1) {
      weeks.push(week);
      week = [];
    }
  });

  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">30일 감정 날씨</p>
      <div className="flex flex-col gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1">
            {week.map((day, di) => {
              const w = getWeather(day.weather);
              const isToday = day.dateStr === new Date().toDateString();
              return (
                <div
                  key={di}
                  className="flex-1 aspect-square rounded-lg flex items-center justify-center text-base"
                  title={`${day.date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}${w ? ' ' + w.label : ''}`}
                  style={{
                    background: w ? w.bg : 'rgba(255,255,255,0.04)',
                    border: isToday ? '2px solid #6366f1' : `1px solid ${w ? w.color + '30' : 'rgba(255,255,255,0.06)'}`,
                    fontSize: '14px',
                  }}
                >
                  {w ? w.emoji : (
                    <span style={{ fontSize: '8px', color: '#1e293b' }}>
                      {day.date.getDate()}
                    </span>
                  )}
                </div>
              );
            })}
            {/* Pad last row */}
            {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, pi) => (
              <div key={`pad-${pi}`} className="flex-1 aspect-square" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
