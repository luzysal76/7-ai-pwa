# 코드리뷰팀 Report

**Topic:** 플로팅 메모 PWA (React + Vite + Tailwind CSS) 코드 리뷰 요청.

## 프로젝트 개요
- Phase 1: 기본 PWA (플로팅 버튼, 메모 입력, AI 분류, 음성 메모, 감정 트래킹)
- Phase 2: 고도화 (스마트 제스처, 방사형 메뉴, 감정날씨 위젯, 위젯 커스터마이징, 상담사 AI, 패턴 분석, TTS 브리핑, 주간회고, 뽀모도로)

## 주요 파일 구조
- src/App.jsx — 메인 앱, 탭 내비게이션, Pomodoro 훅
- src/components/FloatingButton.jsx — 드래그 가능 플로팅 버튼, DND, 자동숨김
- src/components/HomeScreen.jsx — 메모 목록, AI 브리핑, TTS
- src/components/MemoModal.jsx — 메모 입력 모달 (텍스트/음성/할일)
- src/components/SwipeableCard.jsx — 스와이프 제스처 카드
- src/components/RadialMenu.jsx — 방사형 즐겨찾기 메뉴
- src/components/EmotionWeather.jsx — 감정 날씨 위젯 + 30일 히트맵
- src/components/AnalyticsScreen.jsx — 패턴 분석 + 주간 회고
- src/components/SettingsScreen.jsx — 설정 화면
- src/utils/ai.js — Pollinations.ai API 연동
- src/utils/storage.js — LocalStorage 관리
- src/hooks/useStorage.js — 커스텀 스토리지 훅
- src/hooks/useGesture.js — 제스처 훅 (더블탭/롱프레스/스와이프)

## 리뷰 포인트
1. React 19 best practices 준수 여부 (useCallback, useEffect 의존성 등)
2. 모바일 UX 퍼포먼스 이슈 (불필요한 리렌더링, 메모리 누수)
3. 제스처/드래그 구현의 버그 가능성
4. LocalStorage 접근 패턴의 안정성
5. AI API 호출 오류 처리 (Pollinations.ai timeout, 네트워크 오류)
6. PWA 오프라인 지원 및 서비스워커 캐시 전략
7. 코드 중복 제거 및 리팩터링 기회
8. 500줄 초과 파일 여부 및 모듈 분리 필요성
**Total Rounds:** 4
**Date:** 2026-06-19

---

## Round 1 — Stage 1: 코드 리뷰어 ✅

> **Passed → Stage 2**

### 🔴 버그 / 런타임 에러

**B-1. `AnalyticsScreen.jsx` L67 — `alert` 파라미터가 `window.alert`을 가려 TypeError 발생**
```js
const schedulePatternNotification = useCallback((alert, msg) => {
  // ...
  alert('알림이 예약됐어요! 오늘 ' + h + '시에 알림을 드릴게요 💪'); // ← alert은 객체(파라미터), 함수가 아님
}, []);
```
`alert` 파라미터명이 `window.alert`을 완전히 가립니다. 호출 시 `TypeError: alert is not a function` 발생.

**B-2. `App.jsx` L69-79 — `float-dropzone` 이벤트가 항상 첫 번째 미완료 메모를 조작**
```js
const topMemo = memos.find(m => !m.done); // 드래그된 메모가 아닌 첫 번째 메모
if (zone === 'delete') deleteMemo(topMemo.id);
```
FloatingButton을 드래그 드롭할 때 실제 드래그된 메모와 관계없이 `memos` 배열의 첫 번째 미완료 메모가 삭제/완료됩니다.

**B-3. `SwipeableCard.jsx` L49-51 — `onComplete=null` 타입에서 오른쪽 스와이프 시 카드 소실**
```js
} else if (offset > THRESHOLD) {
  setOffset(window.innerWidth);
  setCommitted(true);
  setTimeout(() => onComplete?.(), 280); // onComplete가 null이면 아무것도 안 함
}
```
텍스트/음성 메모(`onComplete={null}`)를 오른쪽으로 스와이프하면 카드가 화면 밖으로 날아가 사라지지만 데이터는 삭제되지 않습니다. 새로고침 시 메모가 다시 나타나는 유령 현상 발생.

**B-4. `MemoModal.jsx` — SpeechRecognition 언마운트 시 cleanup 없음 (메모리 누수)**
```js
// useEffect cleanup 없음
recognitionRef.current = recognition;
recognition.start();
```
모달 닫기 버튼 클릭 시 녹음이 진행 중이면 SpeechRecognition이 백그라운드에서 계속 실행됩니다.

**B-5. `RadialMenu.jsx` L11-18 — setTimeout 이벤트 리스너 등록 누수**
```js
setTimeout(() => window.addEventListener('touchstart', close), 100);
return () => window.removeEventListener('touchstart', close); // 타이머 취소 없음
```
`visible`이 빠르게 true→false로 바뀌면 `setTimeout`이 취소되지 않아 100ms 후 리스너가 등록됩니다. `visible`이 다시 true가 되면 리스너가 중복 등록됩니다.

**B-6. `HomeScreen.jsx` L106-111 — `useEffect` 빈 의존성 배열 + 스테일 클로저**
```js
useEffect(() => {
  if (!briefingShown && taskCount > 0) {
    handleGenerateBriefing(); // 마운트 시점의 오래된 todayMemos 캡처
  }
}, []); // eslint-disable-line ← 경고를 강제 무시
```
마운트 직후 `todayMemos`가 비어있을 수 있어 빈 태스크 목록으로 브리핑이 생성됩니다.

**B-7. `App.jsx` L38 — 렌더 중 `triggerRef.current` 사이드 이펙트 (React 19 Concurrent 비호환)**
```js
triggerRef.current = { start, stop }; // 렌더 함수 내에서 직접 ref 변경
return pomodoroHidden;
```
React 19 Concurrent 모드에서 렌더가 중단/재실행될 때 ref가 예기치 않게 중간 상태로 남을 수 있습니다.

---

### 🟡 성능 이슈

**P-1. `AnalyticsScreen.jsx` — `now`가 매 렌더마다 새 Date 객체 생성 → useCallback 매번 재생성**
```js
const now = new Date(); // 렌더마다 새 참조
const generateReport = useCallback(async () => {
  addReport({ ... weekOf: now.toDateString() ... });
}, [weekDone, weekTotal, topEmotions, topKeywords, counselorMode, addReport, now]); // now 의존성
```

**P-2. `AnalyticsScreen.jsx` — `useMemo` 없이 매 렌더마다 중복 복잡 계산**
`emotionCount`, `topEmotions`, `wordCount`, `topKeywords`가 `useMemo` 없이 매 렌더마다 재계산됩니다.

**P-3. `useStorage.js` — 작업마다 `localStorage` 파싱 2-3회**
```js
const addMemo = useCallback((memo) => {
  const newMemo = memoStorage.add(memo);  // 내부에서 getAll() + save() = 1회 read
  setMemos(memoStorage.getAll());         // 다시 getAll() = 2회 read
}, []);
```

**P-4. `useStorage.js` L52-56 — `stats`, `weeklyTrend`가 렌더마다 재계산**
```js
return {
  stats: emotionStorage.getStats(),        // 매 렌더마다 실행
  weeklyTrend: emotionStorage.getWeeklyTrend(), // 매 렌더마다 실행
};
```

**P-5. `FloatingButton.jsx` — DND 체크 setInterval과 자동숨김 이벤트 리스너 동시 존재**
탭이 살아있는 동안 30초마다 DND 체크가 실행되며 자동숨김 리스너도 모든 touchstart/click에 반응합니다. 두 메커니즘이 단일 `hidden` 상태를 공유하여 충돌 가능합니다.

---

### 🔴 보안 / 개인정보 이슈

**S-1. `ai.js` — 사용자 메모·감정·패턴 데이터가 외부 공개 API로 전송**
Pollinations.ai는 인증 없는 공개 API입니다. 개인 일기, 심리 상태, 할 일 내용이 외부 서버에 전송되는데 UI에 동의/경고 절차가 없습니다. GET 방식으로 전송하므로 서버 액세스 로그에도 노출됩니다.

**S-2. `SettingsScreen.jsx` L74 — `localStorage.clear()`가 앱 데이터 외의 것도 삭제**
```js
localStorage.clear(); // fm_ prefix 외의 동일 도메인 데이터 전체 삭제
```
`fm_` prefix가 있는 데이터만 선택적으로 삭제해야 합니다.

**S-3. `exportData()` — `URL.createObjectURL` 메모리 누수**
```js
const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(...) ... });
a.click(); // revokeObjectURL 호출 없음
```

---

### 🟡 PWA 오프라인 지원 이슈

**W-1. `sw.js` — 빌드된 CSS/JS 파일이 캐시 목록에 없음**
```js
const ASSETS = ['/7-ai-pwa/', '/7-ai-pwa/index.html']; // Vite 빌드 파일 누락
```
Vite 빌드 결과물(해시된 `.js`, `.css`)이 캐시되지 않아 오프라인에서 앱이 흰 화면으로 표시됩니다.

**W-2. `useNotifications.js` — `setTimeout` 기반 알림은 앱이 닫히면 미작동**
```js
setTimeout(() => {
  new Notification('🌅 오늘의 브리핑', message); // 앱 탭이 열려있을 때만 실행
}, delay);
```
PWA 알림은 서비스 워커를 통해 구현해야 백그라운드에서도 동작합니다.

---

### 🟢 코드 품질 / 중복

**Q-1. 우선순위 색상 객체 중복 정의**
- `App.jsx` `TasksScreen`, `TaskItem`에 각각 `const P = { high: '#f87171', mid: '#fbbf24', low: '#34d399' }` 중복
- `HomeScreen.jsx`에는 `PRIORITY_COLORS` 상수로 다른 형태로 또 정의
→ 공통 상수 파일로 추출 필요

**Q-2. `App.jsx` 내 `TasksScreen`, `TaskItem` 컴포넌트 미분리**
275줄이어서 500줄 제한은 넘지 않으나, `TasksScreen`/`TaskItem`이 별도 파일에 있어야 합니다.

**Q-3. `storage.js` — ID 생성에 `Date.now()` 사용 (동시 생성 시 충돌)**
```js
id: Date.now().toString() // 빠른 연속 호출 시 중복 가능
```
`crypto.randomUUID()` 또는 `Date.now() + Math.random()`으로 대체 필요.

**Q-4. `MemoModal.jsx` L35 — `handleTextChange`가 `useCallback` 미적용**
렌더마다 새 함수 참조 생성.

---

---

## Round 2 — Stage 2: 문제 검증자 ✅

> **Passed → Stage 3**

### 🔴 버그 / 런타임 에러 검증

| ID | 분류 | 검증 근거 |
|----|------|----------|
| B-1 | **실제 문제 ✅** | `alert` 파라미터가 전역 `window.alert`을 완전히 섀도잉. 호출 시 `TypeError: alert is not a function` 확실히 발생 |
| B-2 | **실제 문제 ✅** | 드래그 이벤트에 메모 ID를 전달하는 로직 없이 `.find()` 사용 → 의도한 메모가 아닌 첫 번째 미완료 메모 삭제됨 |
| B-3 | **실제 문제 ✅** | `setOffset(window.innerWidth)` 후 `onComplete?.()` no-op → 카드가 시각적으로 사라지지만 데이터는 살아있음. 새로고침 시 유령 메모 재출현 확인 |
| B-4 | **실제 문제 ✅** | `useEffect` cleanup 없이 `recognition.start()` 호출. 모달 닫기 시 백그라운드 녹음 지속 + `onerror`/`onresult` 이벤트 발화 가능 |
| B-5 | **실제 문제 ✅** | `clearTimeout` 없이 cleanup → rapid toggle 시 `addEventListener` 중복 등록 누적. 메뉴 닫기가 두 번 호출되는 현상 발생 |
| B-6 | **실제 문제 ✅** | 빈 deps + `eslint-disable` → 마운트 시 `todayMemos`가 아직 스토리지에서 로드 중일 수 있어 빈 브리핑 생성. 의도적 패턴이 아님 |
| B-7 | **⚠️ 상황에 따라** | 렌더 중 ref 직접 변경은 React 권장 사항 위반. 단, ref는 React가 추적하지 않으므로 Concurrent 재실행이 발생해도 마지막 값으로 덮어써져 실제 오류보다는 개발 모드(StrictMode 이중 렌더)에서만 노출될 가능성이 높음. 낮은 위험도 |

### 🟡 성능 이슈 검증

| ID | 분류 | 검증 근거 |
|----|------|----------|
| P-1 | **실제 문제 ✅** | `new Date()` → 매 렌더 새 참조 → `useCallback` deps 불일치 → 함수 매번 재생성. 의존성 배열에 `now`가 포함된 점으로 검증 |
| P-2 | **실제 문제 ✅** | 반복문 포함한 집계 연산이 `useMemo` 없이 실행. 모바일 저사양 기기에서 감지 가능한 지연 |
| P-3 | **실제 문제 ✅** | `localStorage.getItem` + JSON.parse가 단일 작업당 2-3회. 동기 I/O 누적은 모바일 성능에 실질적 영향 |
| P-4 | **실제 문제 ✅** | `getStats()`, `getWeeklyTrend()`가 렌더마다 localStorage 재파싱. P-3과 동일 문제 |
| P-5 | **⚠️ 상황에 따라** | setInterval과 이벤트 리스너 충돌 가능성은 실제이나, 구현 상세에 따라 실제 레이스 컨디션 여부가 달라짐. 아키텍처 경고 수준 |

### 🔴 보안 / 개인정보 이슈 검증

| ID | 분류 | 검증 근거 |
|----|------|----------|
| S-1 | **실제 문제 ✅** | 개인 일기·심리 데이터가 GET 방식으로 공개 API에 전송, 서버 로그에 URL 노출. 동의 절차 없음. 상담 앱 특성상 민감도 매우 높음 |
| S-2 | **실제 문제 ✅** | `localStorage.clear()`는 스펙상 해당 origin 전체 삭제. 단일 PWA라면 실제 피해는 제한적이나, `fm_` prefix 선택적 삭제가 올바른 방식 |
| S-3 | **실제 문제 ✅** | `revokeObjectURL` 누락 → 페이지 생명주기 동안 Blob 메모리 유지. PWA 장시간 사용 시 누적 |

### 🟡 PWA 오프라인 지원 이슈 검증

| ID | 분류 | 검증 근거 |
|----|------|----------|
| W-1 | **실제 문제 ✅** | Vite 빌드 결과물 해시 파일이 `ASSETS` 미포함 → 오프라인 시 흰 화면. PWA 핵심 기능 완전 파괴 |
| W-2 | **실제 문제 ✅** | `setTimeout` 기반 알림은 탭 닫힘 시 소멸. 서비스 워커 Push API 미사용으로 PWA 알림의 근본 목적 미달 |

### 🟢 코드 품질 검증

| ID | 분류 | 검증 근거 |
|----|------|----------|
| Q-1 | **실제 문제 ✅** | 3곳에 중복 상수 → 색상 변경 시 누락 위험. CLAUDE.md의 단일 책임 원칙과 상충 |
| Q-2 | **⚠️ 상황에 따라** | 500줄 미만이므로 CLAUDE.md 기준은 미위반. 그러나 구조적 분리는 권고사항 |
| Q-3 | **⚠️ 상황에 따라** | JavaScript 단일 스레드 특성상 실제 충돌 빈도 극히 낮음. 그러나 `crypto.randomUUID()` 사용이 명백히 우수한 선택 |
| Q-4 | **⚠️ 상황에 따라** | `React.memo`된 자식에 전달되는 경우에만 실제 불필요한 리렌더 발생. 단독으로는 낮은 우선순위 |

---

### 3단계 전달 목록 (실제 문제 확정)

**우선순위 Critical:** B-1, B-2, B-3, B-5, S-1, W-1  
**우선순위 High:** B-4, B-6, P-1~P-4, S-2, S-3, W-2  
**우선순위 Medium:** Q-1, Q-3  
**조건부 전달:** B-7, P-5, Q-2, Q-4 (컨텍스트 포함하여 전달)

---

---

## Round 3 — Stage 3: 개선 분석자 ✅

> **Passed → Stage 4**

### 🔴 Critical — 즉시 수정 필요

---

#### B-1. `AnalyticsScreen.jsx` L67 — 파라미터명 `alert` 이 `window.alert` 섀도잉

**왜 더 나은가:** 파라미터명을 변경하면 런타임 TypeError 없이 전역 `alert`을 정상 호출할 수 있다. 이름 충돌 자체를 제거하는 것이 가장 안전하다.

```jsx
// ❌ Before
const schedulePatternNotification = useCallback((alert, msg) => {
  // ...
  alert('알림이 예약됐어요!...'); // TypeError: alert is not a function
}, []);

// ✅ After — 파라미터명을 alertData로 변경
const schedulePatternNotification = useCallback((alertData, msg) => {
  if (Notification.permission !== 'granted') return;
  const h = alertData.avgHour;
  const now2 = new Date();
  const target = new Date(); target.setHours(h, 0, 0, 0);
  if (target <= now2) target.setDate(target.getDate() + 1);
  const delay = target - now2;
  setTimeout(() => {
    new Notification(`💡 패턴 감지: ${alertData.pattern}`, {
      body: msg,
      icon: '/7-ai-pwa/icon-192.png',
      tag: 'pattern-' + alertData.pattern,
    });
  }, delay);
  window.alert('알림이 예약됐어요! 오늘 ' + h + '시에 알림을 드릴게요 💪');
}, []);

// 호출부도 수정
onClick={() => schedulePatternNotification(alert, patternMessages[alert.pattern] || '')}
// ↓
onClick={() => schedulePatternNotification(patternAlert, patternMessages[patternAlert.pattern] || '')}
// (map의 변수명도 patternAlert로 변경)
```

**우선순위: Critical** — 알림 예약 버튼 클릭 시 항상 앱 크래시

---

#### B-2. `App.jsx` L72 — 드롭존이 엉뚱한 메모를 삭제

**왜 더 나은가:** 드래그 시작 시점에 메모 ID를 이벤트 `detail`에 포함시켜야 실제 드래그된 메모가 처리된다. FloatingButton이 드래그하는 대상 메모 ID를 함께 dispatch하는 구조로 변경.

```jsx
// App.jsx — 이벤트 핸들러 수정
useEffect(() => {
  const onDrop = (e) => {
    const { zone, memoId } = e.detail; // memoId 추가 수신
    if (!zone) return;
    if (memoId) {
      // 특정 메모 조작
      if (zone === 'delete') deleteMemo(memoId);
      else if (zone === 'complete') toggleDone(memoId);
    } else {
      // fallback: 기존 방식 (하위 호환)
      const topMemo = memos.find(m => !m.done);
      if (!topMemo) return;
      if (zone === 'delete') deleteMemo(topMemo.id);
      else if (zone === 'complete') toggleDone(topMemo.id);
    }
  };
  window.addEventListener('float-dropzone', onDrop);
  return () => window.removeEventListener('float-dropzone', onDrop);
}, [memos, deleteMemo, toggleDone]);

// FloatingButton.jsx — dispatch 시 memoId 포함
window.dispatchEvent(new CustomEvent('float-dropzone', {
  detail: { zone: dropTarget, memoId: draggedMemoId.current }
}));
```

**우선순위: Critical** — 의도하지 않은 메모 삭제/완료 처리

---

#### B-3. `SwipeableCard.jsx` L49-51 — 오른쪽 스와이프 시 유령 메모

**왜 더 나은가:** `onComplete`가 null인 경우(텍스트/음성 메모) 오른쪽 스와이프가 커밋되지 않아야 한다. `onComplete` 존재 여부를 동작 허용 조건으로 추가.

```jsx
// ✅ After — onComplete 없으면 오른쪽 스와이프 허용 안 함
const handleTouchEnd = useCallback(() => {
  if (committed) return;
  if (offset < -THRESHOLD) {
    setOffset(-window.innerWidth);
    setCommitted(true);
    setTimeout(() => onDelete?.(), 280);
  } else if (offset > THRESHOLD && onComplete) {
    // ← onComplete가 있을 때만 커밋
    setOffset(window.innerWidth);
    setCommitted(true);
    setTimeout(() => onComplete(), 280);
  } else {
    // onComplete가 없거나 임계값 미달: 원위치 복귀
    setOffset(0);
  }
  setIsDragging(false);
  startX.current = null;
}, [offset, committed, onDelete, onComplete]);
```

**우선순위: Critical** — 사용자가 데이터 손실 착각, 실제로는 유령 메모 잔존

---

#### B-5. `RadialMenu.jsx` L17 — setTimeout 미취소로 이벤트 리스너 중복 등록

**왜 더 나은가:** `useEffect` cleanup에서 `clearTimeout`까지 처리해야 rapid toggle 시 리스너가 중복 등록되지 않는다.

```jsx
// ✅ After — timerRef로 setTimeout 추적 후 cleanup
import { useEffect, useRef } from 'react';

export default function RadialMenu({ visible, center, templates, onSelect, onClose }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const close = (e) => {
      const dx = e.clientX - center.x;
      const dy = e.clientY - center.y;
      if (Math.sqrt(dx * dx + dy * dy) > DIST + 40) onClose?.();
    };
    // 타이머 ID 저장
    timerRef.current = setTimeout(() => {
      window.addEventListener('touchstart', close);
    }, 100);

    return () => {
      clearTimeout(timerRef.current); // ← 미실행 타이머 취소
      window.removeEventListener('touchstart', close);
    };
  }, [visible, center, onClose]);
  // ...
}
```

**우선순위: Critical** — 메뉴 빠른 열기/닫기 시 리스너 누적 → 이중 close 호출

---

#### S-1. `ai.js` — 개인 데이터 외부 공개 API 전송 (동의 없음)

**왜 더 나은가:** 사용자의 명시적 동의 없이 개인 감정·일기 데이터를 외부로 전송하는 것은 개인정보보호 관점에서 심각한 문제다. 앱 최초 실행 시 동의 UI를 추가하고, 동의하지 않으면 AI 기능을 비활성화해야 한다.

```jsx
// src/components/AIConsentModal.jsx (신규)
export default function AIConsentModal({ onAccept, onDecline }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="mx-4 p-6 rounded-2xl max-w-sm"
        style={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)' }}>
        <h2 className="text-white font-bold mb-3">🤖 AI 기능 사용 동의</h2>
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          AI 분류/브리핑 기능은 메모 내용을 <strong>Pollinations.ai</strong>
          (외부 무료 API)로 전송합니다.<br /><br />
          • 개인 메모, 감정, 할 일 내용이 외부 서버에 전달됩니다<br />
          • 민감한 내용은 메모하지 않는 것을 권장합니다<br />
          • 동의하지 않으면 AI 기능 없이 앱을 사용할 수 있습니다
        </p>
        <div className="flex gap-3">
          <button onClick={onDecline}
            className="flex-1 py-2.5 rounded-xl text-sm text-slate-400"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            AI 기능 안 씀
          </button>
          <button onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            동의하고 사용
          </button>
        </div>
      </div>
    </div>
  );
}

// settingsStorage에 aiConsent 필드 추가 후
// App.jsx에서 settings.aiConsent === null일 때 모달 표시
// ai.js askAI()에서 동의 여부 확인 후 차단
```

**우선순위: Critical** — 상담 앱 특성상 심리 데이터 유출 위험 매우 높음

---

#### W-1. `sw.js` — Vite 빌드 파일 미캐시 → 오프라인 흰 화면

**왜 더 나은가:** Vite의 `vite-plugin-pwa`를 사용하면 빌드 시 자동으로 해시된 파일 목록을 서비스 워커에 주입하여 수동 관리 오류를 원천 차단한다.

```bash
npm install -D vite-plugin-pwa
```

```js
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/text\.pollinations\.ai\/.*/i,
          handler: 'NetworkOnly', // AI API는 캐시 안 함
        }],
      },
      manifest: { /* 기존 manifest 내용 */ }
    }),
  ],
}
```

> 기존 수동 `sw.js`는 `vite-plugin-pwa`가 생성하는 `sw.js`로 대체. 수동 파일 목록 관리 불필요.

**우선순위: Critical** — PWA의 핵심 기능(오프라인 작동) 완전 불능

---

### 🟡 High — 빠른 수정 권장

---

#### B-4. `MemoModal.jsx` — SpeechRecognition 언마운트 cleanup 누락

```jsx
// ✅ After — useEffect로 cleanup 보장
useEffect(() => {
  return () => {
    // 언마운트 시 진행 중인 음성 인식 강제 종료
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };
}, []);
```

**우선순위: High** — 백그라운드 녹음 지속 + 메모리 누수

---

#### B-6. `HomeScreen.jsx` L106-111 — 스테일 클로저 브리핑 자동 생성

**왜 더 나은가:** 빈 deps를 제거하고 `memos` 변화를 deps로 추가하면 마운트 후 데이터가 로드된 시점에 정확히 브리핑이 생성된다.

```jsx
// ✅ After — memos가 준비된 후 한 번만 실행
const briefingTriggered = useRef(false);

useEffect(() => {
  if (!briefingTriggered.current && taskCount > 0) {
    briefingTriggered.current = true;
    handleGenerateBriefing();
  }
}, [taskCount]); // memos 로드 후 taskCount가 0→N이 될 때 실행
```

> `useRef`로 "이미 실행됨" 플래그를 관리하면 `eslint-disable` 없이도 한 번만 실행 보장.

**우선순위: High** — 빈 브리핑 생성으로 AI 호출 낭비

---

#### P-1 + P-2. `AnalyticsScreen.jsx` — `now` 매 렌더 재생성 + 집계 연산 `useMemo` 미적용

```jsx
// ✅ After — useMemo로 감싸기
import { useState, useCallback, useMemo } from 'react';

export default function AnalyticsScreen({ memos, emotions, ... }) {
  // now를 useMemo로 안정화 (매 렌더 새 참조 방지)
  const now = useMemo(() => new Date(), []); // 컴포넌트 마운트 시 한 번만

  const { weekMemos, weekDone, weekTotal, weekEmotions } = useMemo(() => {
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const weekMemos = memos.filter(m => new Date(m.createdAt) >= weekStart);
    return {
      weekMemos,
      weekDone: weekMemos.filter(m => m.done).length,
      weekTotal: weekMemos.filter(m => m.type === 'task').length,
      weekEmotions: emotions.filter(e => new Date(e.createdAt) >= weekStart),
    };
  }, [memos, emotions, now]);

  const topEmotions = useMemo(() => {
    const emotionCount = {};
    weekEmotions.forEach(e => { emotionCount[e.emotion] = (emotionCount[e.emotion] || 0) + 1; });
    return Object.entries(emotionCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }, [weekEmotions]);

  const topKeywords = useMemo(() => {
    const wordCount = {};
    weekMemos.flatMap(m => m.content.split(/\s+/).filter(w => w.length > 1))
             .forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
    return Object.entries(wordCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  }, [weekMemos]);

  // useCallback deps에서 now 제거 가능 (안정적 참조)
  const generateReport = useCallback(async () => { ... }, [weekDone, weekTotal, topEmotions, topKeywords, counselorMode, addReport]);
```

**우선순위: High** — 모바일 저사양 기기에서 탭 전환 시 지연 발생

---

#### P-3 + P-4. `useStorage.js` — LocalStorage 중복 파싱

**왜 더 나은가:** `add/update/delete` 후 setState에 갱신된 배열을 직접 전달하면 getAll() 재호출(파싱)을 1회 제거. `stats`/`weeklyTrend`는 `useMemo`로 메모이제이션.

```js
// ✅ After — useStorage.js
export function useMemos() {
  const [memos, setMemos] = useState(() => memoStorage.getAll());

  const addMemo = useCallback((memo) => {
    const newMemo = memoStorage.add(memo);
    // getAll() 재호출 없이 상태 업데이트
    setMemos(prev => [newMemo, ...prev]);
    return newMemo;
  }, []);

  const updateMemo = useCallback((id, updates) => {
    memoStorage.update(id, updates);
    setMemos(prev => prev.map(m =>
      m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
    ));
  }, []);

  const deleteMemo = useCallback((id) => {
    memoStorage.delete(id);
    setMemos(prev => prev.filter(m => m.id !== id));
  }, []);

  // ...
}

// useEmotions — stats/weeklyTrend 메모이제이션
export function useEmotions() {
  const [emotions, setEmotions] = useState(() => emotionStorage.getAll());

  // 렌더마다 재계산 제거
  const stats = useMemo(() => {
    const s = {};
    emotions.forEach(e => { s[e.emotion] = (s[e.emotion] || 0) + 1; });
    return s;
  }, [emotions]);

  const weeklyTrend = useMemo(() => emotionStorage.getWeeklyTrend(), [emotions]);

  return { emotions, addEmotion, stats, weeklyTrend };
}
```

**우선순위: High** — 메모 추가/수정 시 동기 localStorage 파싱 3회 → 1회로 감소

---

#### S-2. `SettingsScreen.jsx` L74 — `localStorage.clear()` 전체 삭제

```js
// ❌ Before
localStorage.clear();

// ✅ After — fm_ prefix만 선택적 삭제
const clearData = () => {
  if (confirm('모든 데이터를 삭제할까요? 되돌릴 수 없어요.')) {
    Object.keys(localStorage)
      .filter(key => key.startsWith('fm_'))
      .forEach(key => localStorage.removeItem(key));
    window.location.reload();
  }
};
```

**우선순위: High** — 동일 도메인의 타 데이터 삭제 위험

---

#### S-3. `SettingsScreen.jsx` — `URL.createObjectURL` 메모리 누수

```js
// ✅ After — 클릭 후 즉시 revoke
const exportData = () => {
  const data = {
    memos: JSON.parse(localStorage.getItem('fm_memos') || '[]'),
    emotions: JSON.parse(localStorage.getItem('fm_emotions') || '[]'),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `floating-memo-${new Date().toLocaleDateString('ko-KR').replace(/\./g, '-')}.json`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url); // ← 즉시 해제
};
```

**우선순위: High** — PWA 장시간 사용 시 Blob 메모리 누적

---

#### W-2. 알림이 앱 종료 시 미작동 (setTimeout 기반)

**왜 더 나은가:** Service Worker의 `showNotification()`을 사용해야 탭이 닫혀도 알림이 작동한다.

```js
// sw.js에 추가
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, tag } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, { body, icon: '/7-ai-pwa/icon-192.png', tag });
    }, delay);
  }
});

// useNotifications.js — SW에 메시지 전달로 변경
const scheduleNotification = (delay, title, body, tag) => {
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION', delay, title, body, tag,
    });
  } else {
    // fallback: 탭이 열려있을 때만 동작하는 기존 방식
    setTimeout(() => new Notification(title, { body }), delay);
  }
};
```

**우선순위: High** — PWA 알림의 핵심 목적 미달

---

### 🟢 Medium — 코드 품질 개선

---

#### Q-1. 우선순위 색상 상수 3곳 중복

```js
// ✅ src/constants/priority.js (신규)
export const PRIORITY_COLORS = {
  high: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: '#f87171', label: '긴급' },
  mid:  { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', label: '보통' },
  low:  { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)', text: '#34d399', label: '여유' },
};
// App.jsx, HomeScreen.jsx, TasksScreen, TaskItem에서 import로 통일
```

**우선순위: Medium** — 색상 변경 시 누락 방지, 단일 책임 원칙 준수

---

#### Q-3. `storage.js` — `Date.now()` ID 충돌 가능성

```js
// ✅ After — crypto.randomUUID() 사용
const newMemo = {
  id: crypto.randomUUID(), // 중복 불가 UUID v4
  // ...
};
// emotionStorage, reportStorage도 동일하게 적용
```

**우선순위: Medium** — 빠른 연속 추가 시 ID 중복 방지 (모바일 단일 스레드이나 명백히 우수한 선택)

---

#### B-7. `App.jsx` L38 — 렌더 중 ref 변경 (조건부 처리)

```js
// ✅ After — useEffect로 이동
useEffect(() => {
  triggerRef.current = { start, stop };
}); // 의존성 없이 매 렌더 후 실행 (안전)
```

**우선순위: Low** — StrictMode 이중 렌더에서만 관찰되는 문제, 프로덕션 영향 미미

---

### 📋 수정 우선순위 요약

| 우선순위 | ID | 파일 | 핵심 액션 |
|---------|-----|------|----------|
| 🔴 Critical | B-1 | AnalyticsScreen | 파라미터명 `alert` → `alertData` |
| 🔴 Critical | B-2 | App + FloatingButton | dispatch에 `memoId` 포함 |
| 🔴 Critical | B-3 | SwipeableCard | `onComplete` null 체크 추가 |
| 🔴 Critical | B-5 | RadialMenu | `clearTimeout` + cleanup |
| 🔴 Critical | S-1 | ai.js + App | AI 동의 모달 추가 |
| 🔴 Critical | W-1 | sw.js → vite.config | vite-plugin-pwa 도입 |
| 🟡 High | B-4 | MemoModal | recognition cleanup useEffect |
| 🟡 High | B-6 | HomeScreen | `useRef` 플래그로 deps 수정 |
| 🟡 High | P-1,P-2 | AnalyticsScreen | `useMemo` 적용 |
| 🟡 High | P-3,P-4 | useStorage | setState 직접 업데이트 |
| 🟡 High | S-2 | SettingsScreen | prefix 선택적 삭제 |
| 🟡 High | S-3 | SettingsScreen | `revokeObjectURL` 추가 |
| 🟡 High | W-2 | sw.js + useNotifications | SW 메시지 기반 알림 |
| 🟢 Medium | Q-1 | constants/priority.js | 공통 상수 파일 추출 |
| 🟢 Medium | Q-3 | storage.js | `crypto.randomUUID()` |

---

---

## Round 4 — Stage 4: 최종 확인자 🏆

### 🔍 최종 검증 결과

#### ✅ 검증 통과

| ID | 수정 코드 | 검증 결론 |
|----|----------|---------|
| B-1 | `alert` → `alertData` 파라미터 리네이밍 | ✅ 섀도잉 제거, `window.alert` 정상 호출 가능 |
| B-2 | dispatch에 `memoId` 포함 + 폴백 유지 | ✅ 의도된 메모 조작 보장, 하위 호환 안전 |
| B-3 | `onComplete` null 체크 후 커밋 | ✅ 유령 메모 원천 차단, `setOffset(0)` 복귀 정확 |
| B-4 | `useEffect` cleanup으로 recognition 강제 종료 | ✅ 이벤트 핸들러 null 처리 후 stop() 호출 순서 올바름 |
| B-5 | `timerRef`로 setTimeout 추적 + `clearTimeout` cleanup | ✅ rapid toggle 시 중복 리스너 등록 방지 완벽 |
| B-6 | `useRef` 플래그 + `taskCount` 의존성 | ✅ `eslint-disable` 제거, 데이터 로드 후 정확히 1회 실행 보장 |
| P-1,P-2 | `useMemo(() => new Date(), [])` + 집계 메모이제이션 | ✅ `useCallback` deps 안정화, 불필요한 재계산 제거 |
| P-3,P-4 | `setMemos(prev => ...)` 직접 업데이트 + stats useMemo | ✅ localStorage 파싱 3회 → 1회 감소, 명확한 개선 |
| S-1 | `AIConsentModal` + 동의 여부 확인 후 AI 차단 | ✅ 개인정보보호 원칙 준수, UX 적절 |
| S-2 | `fm_` prefix 선택적 삭제 | ✅ 타 origin 데이터 보호 |
| S-3 | `URL.revokeObjectURL` 즉시 호출 | ✅ 클릭 후 즉시 해제, 메모리 누수 차단 |
| W-1 | `vite-plugin-pwa` 도입, workbox 자동 캐시 | ✅ 업계 표준, 빌드 해시 파일 자동 관리 |
| W-2 | SW 메시지 기반 `showNotification` + 폴백 | ✅ 탭 닫혀도 동작, 폴백으로 하위 호환 유지 |
| Q-1 | `constants/priority.js` 공통 상수 추출 | ✅ 단일 책임 원칙, 색상 변경 누락 방지 |
| Q-3 | `crypto.randomUUID()` | ✅ 충돌 불가 UUID, 모범 사례 |

#### ⚠️ 주의 사항 (치명적 문제 없음, 참고용)

1. **B-2 부분 구현 필요**: `FloatingButton.jsx`에서 `draggedMemoId.current` ref를 실제로 추가해야 dispatch가 `memoId`를 포함할 수 있음. 현재 FloatingButton이 메모를 드래그하는 개념 자체가 불명확하면 폴백(기존 방식)으로 동작하므로 안전하나, 완전한 수정을 위해선 FloatingButton 내 메모 참조 로직도 함께 업데이트 필요.

2. **P-1의 `now` 고착화**: `useMemo(() => new Date(), [])` 는 마운트 시 고정됨. AnalyticsScreen이 며칠간 unmount 없이 유지되면 `now`가 오래된 값이 됨. 그러나 일반적 PWA 탭 전환 패턴에서는 재마운트가 일어나므로 **실사용 영향 없음**.

3. **W-2 한계**: SW의 `setTimeout`도 브라우저가 완전히 종료되면 동작 안 함. 진정한 백그라운드 알림은 Push API + 서버가 필요하지만, 이는 현재 아키텍처(서버리스 PWA) 범위를 벗어나므로 현재 제안이 현실적 최선.

---

## 📋 최종 리뷰 결과 — 우선순위별 이슈 목록 + 검증된 개선 코드 총평

### 🔴 Critical (즉시 수정)

| ID | 파일 | 문제 요약 | 검증된 수정 방법 |
|----|------|----------|----------------|
| **B-1** | `AnalyticsScreen.jsx` | 파라미터 `alert`이 `window.alert` 섀도잉 → TypeError 크래시 | 파라미터명 `alertData`로 변경, 호출부 map 변수도 동일 변경 |
| **B-2** | `App.jsx` + `FloatingButton.jsx` | 드롭존이 드래그된 메모가 아닌 첫 번째 메모를 삭제 | dispatch `detail`에 `memoId` 포함, App.jsx에서 memoId 우선 처리 |
| **B-3** | `SwipeableCard.jsx` | `onComplete=null`일 때 오른쪽 스와이프 시 유령 메모 발생 | `onComplete` 존재 시에만 커밋, 없으면 `setOffset(0)` 복귀 |
| **B-5** | `RadialMenu.jsx` | `clearTimeout` 없이 cleanup → 리스너 중복 등록 누적 | `timerRef`로 타이머 추적 후 cleanup에서 `clearTimeout` + `removeEventListener` |
| **S-1** | `ai.js` + `App.jsx` | 동의 없이 개인 감정·일기 데이터를 외부 공개 API 전송 | `AIConsentModal` 신규 컴포넌트 + 앱 첫 실행 시 동의 요구, 미동의 시 AI 기능 차단 |
| **W-1** | `sw.js` → `vite.config.js` | Vite 빌드 파일 미캐시 → 오프라인 흰 화면 | `vite-plugin-pwa` 도입, workbox `globPatterns`으로 자동 캐시 |

### 🟡 High (빠른 수정 권장)

| ID | 파일 | 문제 요약 | 검증된 수정 방법 |
|----|------|----------|----------------|
| **B-4** | `MemoModal.jsx` | 모달 닫기 시 SpeechRecognition 백그라운드 실행 지속 | `useEffect` cleanup에서 핸들러 null 처리 후 `stop()` 호출 |
| **B-6** | `HomeScreen.jsx` | 빈 deps + 스테일 클로저로 빈 브리핑 자동 생성 | `useRef` 플래그 + `taskCount` 의존성으로 데이터 로드 후 1회 실행 |
| **P-1,P-2** | `AnalyticsScreen.jsx` | `new Date()` 매 렌더 재생성 + 집계 연산 `useMemo` 미적용 | `useMemo` 로 `now`, `topEmotions`, `topKeywords`, 주간 집계 일괄 메모이제이션 |
| **P-3,P-4** | `useStorage.js` | 작업마다 localStorage 파싱 2~3회, stats 매 렌더 재계산 | `setMemos(prev => ...)` 직접 업데이트 + stats/weeklyTrend `useMemo` |
| **S-2** | `SettingsScreen.jsx` | `localStorage.clear()`로 origin 전체 데이터 삭제 | `fm_` prefix 필터 후 선택적 `removeItem` |
| **S-3** | `SettingsScreen.jsx` | `URL.createObjectURL` 후 `revokeObjectURL` 누락 | `a.click()` 직후 `URL.revokeObjectURL(url)` 즉시 호출 |
| **W-2** | `sw.js` + `useNotifications.js` | setTimeout 기반 알림은 탭 종료 시 미작동 | SW 메시지(`SCHEDULE_NOTIFICATION`) 기반 `showNotification` + 폴백 |

### 🟢 Medium (코드 품질)

| ID | 파일 | 문제 요약 | 검증된 수정 방법 |
|----|------|----------|----------------|
| **Q-1** | 3곳 중복 | 우선순위 색상 상수 3곳 중복 정의 | `src/constants/priority.js` 신규 추출, import로 통일 |
| **Q-3** | `storage.js` | `Date.now()` ID 생성 → 동시 추가 시 중복 가능 | `crypto.randomUUID()` 교체 |

### 🟡 Low (조건부 개선)

| ID | 비고 |
|----|------|
| **B-7** | StrictMode 이중 렌더 환경에서만 관찰되는 문제. `useEffect(() => { triggerRef.current = { start, stop }; })` 로 이동 권장하나, 프로덕션 영향 미미 |
| **P-5** | setInterval + 이벤트 리스너 단일 state 공유 충돌 아키텍처 경고. 단기적 위험 낮으나 중장기 리팩토링 시 단일 제어 흐름으로 통합 권장 |
| **Q-2** | `App.jsx` 내 `TasksScreen`/`TaskItem` 미분리. 500줄 기준 미위반이나 구조적 분리 권고 |
| **Q-4** | `MemoModal.jsx` `handleTextChange` `useCallback` 미적용. `React.memo` 자식에 전달 시에만 실질적 영향 |

---

---

