"use client";
export default function TypingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="px-4 py-1 text-xs text-neutral-500">Someone is typing...</div>
  );
}

