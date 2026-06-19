import { Shield } from 'lucide-react';

// S-1: AI 기능 개인정보 동의 모달
// Pollinations.ai는 무료 공개 API이므로 메모 내용이 외부 전송됨을 안내
export default function AIConsentModal({ onAccept, onDecline }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg slide-up"
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          borderTop: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '20px 20px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        <div className="p-6 pt-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Shield size={20} color="#818cf8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI 기능 개인정보 안내</h2>
              <p className="text-xs text-slate-500">처음 사용 전 동의가 필요해요</p>
            </div>
          </div>

          <div className="p-4 rounded-xl mb-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm text-slate-300 leading-relaxed">
              AI 기능(브리핑, 할 일 분류, 패턴 분석 등)은 메모 내용을{' '}
              <span className="text-yellow-400 font-semibold">Pollinations.ai</span>
              {' '}서버로 전송해 분석합니다.
            </p>
            <ul className="mt-3 space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">⚠️</span>
                감정 일기, 개인 메모 내용이 포함될 수 있어요
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">ℹ️</span>
                Pollinations.ai는 무료 공개 API로, 익명 처리됩니다
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">✓</span>
                설정에서 언제든 AI 기능을 비활성화할 수 있어요
              </li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#64748b',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              AI 기능 끄기
            </button>
            <button
              onClick={onAccept}
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white' }}
            >
              동의하고 사용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
