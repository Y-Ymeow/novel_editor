import { useState, useRef, useEffect, forwardRef } from "react";

interface FullscreenTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const FullscreenTextarea = forwardRef<
  HTMLTextAreaElement,
  FullscreenTextareaProps
>(({ value, onChange, placeholder = "", className = "" }, ref) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef =
    (ref as React.RefObject<HTMLTextAreaElement>) || internalTextareaRef;

  useEffect(() => {
    if (isFullscreen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFullscreen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isFullscreen) {
      setIsFullscreen(false);
    }
  };

  return (
    <>
      <div className={`relative flex flex-col ${className}`}>
        <textarea
          ref={textareaRef}
          className="w-full flex-1 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
        />
        <button
          className="absolute bottom-2 right-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-medium transition-colors"
          onClick={() => setIsFullscreen(true)}
          title="全屏编辑 (按 Esc 退出)"
        >
          ⛶ 全屏
        </button>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 bg-slate-900 z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800 shrink-0">
            <h3 className="text-lg font-semibold text-white">全屏编辑</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">{value.length} 字</span>
              <button
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                onClick={() => setIsFullscreen(false)}
              >
                ✕ 关闭 (Esc)
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden min-h-0">
            <textarea
              className="w-full h-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-base leading-relaxed"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      )}
    </>
  );
});

FullscreenTextarea.displayName = "FullscreenTextarea";

export default FullscreenTextarea;
