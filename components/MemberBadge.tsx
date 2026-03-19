'use client';

interface MemberBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export default function MemberBadge({ name, color, size = 'md', showName = true }: MemberBadgeProps) {
  const dotSize = size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 ${textSize} font-medium`}>
      <span
        className={`${dotSize} rounded-full flex-shrink-0 ring-1 ring-white/20`}
        style={{ backgroundColor: color }}
      />
      {showName && <span className="truncate">{name}</span>}
    </span>
  );
}
