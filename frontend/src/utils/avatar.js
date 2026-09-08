const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-600',
  'bg-cyan-600',
];

export function getInitials(name) {
  return name?.trim()?.charAt(0)?.toUpperCase() || '?';
}

export function getAvatarColor(id = '') {
  const index = String(id)
    .split('')
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
