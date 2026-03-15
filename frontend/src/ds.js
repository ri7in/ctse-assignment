// Design System — Apple + Airbnb hybrid
export const C = {
  // Backgrounds
  bg:       '#F5F5F7',
  card:     '#FFFFFF',
  // Text
  text:     '#1D1D1F',
  sub:      '#6E6E73',
  muted:    '#ABABAB',
  // Accent (Airbnb coral)
  accent:   '#FF385C',
  accentHover: '#E31C5F',
  accentLight: '#FFF0F3',
  // Semantic
  success:  '#00A699',
  successBg:'#E8F8F7',
  warning:  '#FF9500',
  warningBg:'#FFF8EE',
  info:     '#007AFF',
  infoBg:   '#EBF4FF',
  danger:   '#E8000D',
  dangerBg: '#FFEBEC',
  // Borders
  border:   '#E5E5E5',
  borderMd: '#DDDDDD',
};

export const SHADOW = {
  xs: '0 1px 3px rgba(0,0,0,0.06)',
  sm: '0 2px 8px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
  md: '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  lg: '0 12px 32px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
};

export const RADIUS = {
  sm: '8px', md: '12px', lg: '16px', xl: '20px', full: '9999px',
};

export const FONT = `'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`;

// Shared component styles
export const cardStyle = {
  background: C.card,
  borderRadius: RADIUS.lg,
  boxShadow: SHADOW.sm,
  border: `1px solid ${C.border}`,
  padding: '24px',
};

export const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  border: `1.5px solid ${C.borderMd}`,
  borderRadius: RADIUS.md,
  fontSize: 15,
  color: C.text,
  background: C.card,
  outline: 'none',
  fontFamily: FONT,
  transition: 'border-color .15s',
  boxSizing: 'border-box',
};

export const btnPrimary = {
  background: C.accent,
  color: '#fff',
  border: 'none',
  borderRadius: RADIUS.full,
  padding: '14px 28px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: FONT,
  transition: 'background .15s, transform .1s',
  letterSpacing: '-.01em',
};

export const btnSecondary = {
  background: 'transparent',
  color: C.text,
  border: `1.5px solid ${C.borderMd}`,
  borderRadius: RADIUS.full,
  padding: '13px 28px',
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: FONT,
  transition: 'border-color .15s, background .15s',
};

export const btnGhost = {
  background: 'transparent',
  color: C.sub,
  border: 'none',
  borderRadius: RADIUS.sm,
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: FONT,
};

export const PAGE = {
  maxWidth: 1200,
  padding: '0 24px',
};

export const STATUS_COLOR = {
  'backlog':     { bg: '#F3F4F6', text: '#6B7280' },
  'todo':        { bg: '#EFF6FF', text: '#2563EB' },
  'in-progress': { bg: '#FFF7ED', text: '#C2410C' },
  'in-review':   { bg: '#FFFBEB', text: '#D97706' },
  'done':        { bg: C.successBg, text: C.success },
};

export const PRIORITY_COLOR = {
  'low':    { bg: '#F3F4F6', text: '#6B7280' },
  'medium': { bg: '#EFF6FF', text: '#2563EB' },
  'high':   { bg: '#FFF7ED', text: '#C2410C' },
  'urgent': { bg: C.dangerBg, text: C.danger },
};

export const PROJECT_COLORS = [
  '#FF385C','#007AFF','#00A699','#FF9500','#AF52DE','#32D74B','#FF6B6B','#0EA5E9',
];
