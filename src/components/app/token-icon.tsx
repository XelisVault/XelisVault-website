'use client'

interface TokenIconProps {
  symbol: 'XEL' | 'xUSD' | 'VLT'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_MAP = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-10 h-10',
}

const ICON_PATHS: Record<string, string> = {
  XEL: '/images/xel-icon.png',
  xUSD: '/images/xusd-icon.png',
  VLT: '/images/vault-icon.png',
}

const RING_COLORS: Record<string, string> = {
  XEL: 'ring-xusd/40',      // XEL token is teal/cyan, matches xusd ring color family
  xUSD: 'ring-xusd/40',
  VLT: 'ring-vlt/40',
}

const TEXT_FALLBACK: Record<string, string> = {
  XEL: 'text-xusd',         // XEL uses teal (token logo is teal)
  xUSD: 'text-xusd',
  VLT: 'text-vlt',
}

export function TokenIcon({ symbol, size = 'sm', className = '' }: TokenIconProps) {
  const sizeClass = SIZE_MAP[size]
  const ringColor = RING_COLORS[symbol]
  const textColor = TEXT_FALLBACK[symbol]

  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}>
      <img
        src={ICON_PATHS[symbol]}
        alt={symbol}
        className={`w-full h-full rounded-full object-cover ring-1 ${ringColor}`}
        loading="lazy"
      />
    </span>
  )
}

// Compact inline version: icon + symbol text + optional amount
export function TokenAmount({
  symbol,
  amount,
  size = 'sm',
  showIcon = true,
  className = '',
}: {
  symbol: 'XEL' | 'xUSD' | 'VLT'
  amount?: string | number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}) {
  const textSize = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size]

  const symbolColors: Record<string, string> = {
    XEL: 'text-vault',
    xUSD: 'text-xusd',
    VLT: 'text-vlt',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showIcon && <TokenIcon symbol={symbol} size={size} />}
      {amount !== undefined && (
        <span className={`font-mono font-semibold ${textSize}`}>{amount}</span>
      )}
      <span className={`font-mono font-bold ${textSize} ${symbolColors[symbol]}`}>{symbol}</span>
    </span>
  )
}
