// Unique app icon - abstract geometric shapes suggesting AI assistance
export function AppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 6 L16 10 L12 14 L8 10 Z"
        fill="currentColor"
      />
      <circle
        cx="12"
        cy="17"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
}