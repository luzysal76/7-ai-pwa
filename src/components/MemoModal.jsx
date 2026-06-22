import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mic, MicOff, CheckSquare, FileText, Send, Image, Calendar, Trash2 } from 'lucide-react';

const EMOTIONS = [
  { emoji: '😊', label: '행복' },
  { emoji: '😐', label: '보통' },
  { emoji: '😔', label: '슬픔' },
  { emoji: '😠', label: '화남' },
  { emoji: '😰', label: '불안' },
  { emoji: '🥰', label: '설렘' },
  { emoji: '😴', label: '피곤' },
  { emoji: '💪', label: '의욕' },
];

// Resize image file to max width/height (returns base64)
function resizeImage(file, maxSize = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Local datetime string (YYYY-MM-DDTHH:mm) for <input type="datetime-local">
function toLocalDatetimeStr(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MemoModal({ onClose, onSave, onSaveEmotion, initialMode }) {
  const resolvedInit = initialMode === 'voice' ? 'voice' : (initialMode === 'task' || initialMode === 'focus') ? 'task' : 'text';
  const [text, setText] = useState('');
  const [mode, setMode] = useState(resolvedInit);
  const [selectedEmotion, setSelectedEmotion] = useState(null);
  const [showEmotionPicker, setShowEmotionPicker] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  // Image state
  const [images, setImages] = useState([]); // array of base64 strings
  const fileInputRef = useRef(null);

  // Schedule state
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(''); // ISO string

  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Cleanup SpeechRecognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  const handleTextChange = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  // Image picker
  const handleImagePick = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const resized = await Promise.all(files.slice(0, 4).map(f => resizeImage(f)));
    setImages(prev => [...prev, ...resized].slice(0, 4));
    e.target.value = '';
  }, []);

  const removeImage = useCallback((idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Toggle schedule picker
  const toggleSchedule = useCallback(() => {
    if (showSchedule) {
      setShowSchedule(false);
      setScheduleAt('');
    } else {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      setScheduleAt(toLocalDatetimeStr(now));
      setShowSchedule(true);
    }
  }, [showSchedule]);

  // Voice recognition
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않아요.');
      return;
    }
    if (recognizing) {
      recognitionRef.current?.stop();
      setRecognizing(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.continuous = false;
    recognition.interimResults = true;

    let finalTranscript = text;

    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + t;
        } else {
          interim = t;
        }
      }
      setText(finalTranscript + (interim ? ` ${interim}` : ''));
    };

    recognition.onend = () => { setRecognizing(false); setText(finalTranscript); };
    recognition.onerror = () => setRecognizing(false);

    recognitionRef.current = recognition;
    recognition.start();
    setRecognizing(true);
    setMode('voice');
  }, [recognizing, text]);

  const handleSave = () => {
    if (!text.trim() && !selectedEmotion && images.length === 0) return;

    const scheduleIso = scheduleAt ? new Date(scheduleAt).toISOString() : null;

    if (text.trim() || images.length > 0) {
      onSave({
        content: text.trim(),
        type: mode === 'task' ? 'task' : mode === 'voice' ? 'voice' : 'text',
        emotion: selectedEmotion?.emoji || null,
        images,
        scheduleAt: scheduleIso,
      });
    }

    if (selectedEmotion) {
      onSaveEmotion?.(selectedEmotion.emoji, text.trim());
    }

    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const hasContent = text.trim() || selectedEmotion || images.length > 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleOverlayClick}
    >
      <div
        className="w-full max-w-lg slide-up"
        style={{
          background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
          borderTop: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '20px 20px 0 0',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 px-4 pt-2 pb-3">
          {[
            { key: 'text',  icon: <FileText size={16} />,    label: '메모' },
            { key: 'task',  icon: <CheckSquare size={16} />, label: '할 일' },
            { key: 'voice', icon: <Mic size={16} />,         label: '음성' },
          ].map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: mode === m.key ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)',
                color: mode === m.key ? 'white' : '#94a3b8',
              }}
            >
              {m.icon}{m.label}
            </button>
          ))}

          <div className="flex-1" />

          {/* Emotion button */}
          <button
            onClick={() => setShowEmotionPicker(!showEmotionPicker)}
            className="px-3 py-1.5 rounded-full text-sm transition-all"
            style={{
              background: showEmotionPicker ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
              color: '#94a3b8',
              border: showEmotionPicker ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
            }}
          >
            {selectedEmotion ? selectedEmotion.emoji : '😊'} 감정
          </button>

          {/* Close */}
          <button onClick={onClose} className="p-2 rounded-full" style={{ color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        {/* Emotion picker */}
        {showEmotionPicker && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {EMOTIONS.map(e => (
                <button
                  key={e.emoji}
                  onClick={() => { setSelectedEmotion(e.emoji === selectedEmotion?.emoji ? null : e); setShowEmotionPicker(false); }}
                  className="flex flex-col items-center gap-0.5 p-2 rounded-xl transition-all"
                  style={{
                    background: selectedEmotion?.emoji === e.emoji ? 'rgba(99,102,241,0.25)' : 'transparent',
                    border: selectedEmotion?.emoji === e.emoji ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
                  }}
                >
                  <span className="text-2xl">{e.emoji}</span>
                  <span className="text-xs text-slate-400">{e.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule picker */}
        {showSchedule && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Calendar size={16} color="#818cf8" />
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={e => setScheduleAt(e.target.value)}
                className="flex-1 bg-transparent text-slate-200 text-sm outline-none"
                style={{ colorScheme: 'dark' }}
              />
              <button onClick={toggleSchedule} style={{ color: '#64748b' }}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Image previews */}
        {images.length > 0 && (
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
            {images.map((src, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img
                  src={src}
                  alt=""
                  className="w-20 h-20 object-cover rounded-xl"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: '#ef4444' }}
                >
                  <X size={10} color="white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="px-4 pb-2">
          <div
            className="relative rounded-2xl p-3"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              placeholder={
                mode === 'task' ? '오늘 해야 할 일을 입력하세요...' :
                mode === 'voice' ? '음성 인식 결과가 여기 표시됩니다...' :
                '지금 떠오르는 생각을 적어보세요...'
              }
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 outline-none resize-none text-base leading-relaxed"
              style={{ minHeight: '80px', maxHeight: '200px' }}
              rows={3}
            />
            {selectedEmotion && (
              <div className="flex items-center gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="text-lg">{selectedEmotion.emoji}</span>
                <span className="text-xs text-slate-400">{selectedEmotion.label} 기분이에요</span>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 px-4 pb-4 pt-1">
          {/* Voice button */}
          <button
            onClick={toggleVoice}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: recognizing ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
              border: recognizing ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',
              animation: recognizing ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {recognizing ? <MicOff size={17} color="#f87171" /> : <Mic size={17} color="#94a3b8" />}
          </button>

          {/* Image picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: images.length > 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${images.length > 0 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <Image size={17} color={images.length > 0 ? '#818cf8' : '#94a3b8'} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImagePick}
          />

          {/* Schedule button */}
          <button
            onClick={toggleSchedule}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-all"
            style={{
              background: showSchedule ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${showSchedule ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >
            <Calendar size={17} color={showSchedule ? '#818cf8' : '#94a3b8'} />
          </button>

          {recognizing && <span className="text-xs text-red-400 animate-pulse">녹음 중...</span>}

          <div className="flex-1" />

          <span className="text-xs text-slate-600">{text.length}</span>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasContent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all"
            style={{
              background: hasContent ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.08)',
              color: hasContent ? 'white' : '#475569',
              opacity: hasContent ? 1 : 0.5,
            }}
          >
            <Send size={14} />
            저장
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
            50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
          }
        `}</style>
      </div>
    </div>
  );
}
