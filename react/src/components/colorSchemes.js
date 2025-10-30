// Color schemes for charts
export const colorSchemes = {
  default: [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316', // Orange
  ],
  pastel: [
    '#a7c7e7', // Pastel Blue
    '#b4e7ce', // Pastel Green
    '#f5d0a9', // Pastel Orange
    '#f7b7bd', // Pastel Pink
    '#d4c5e2', // Pastel Purple
    '#f9e4b7', // Pastel Yellow
    '#b5e7e7', // Pastel Cyan
    '#e7c5d4', // Pastel Rose
  ],
  vibrant: [
    '#0066cc', // Vibrant Blue
    '#00cc66', // Vibrant Green
    '#ff9900', // Vibrant Orange
    '#cc0000', // Vibrant Red
    '#9900cc', // Vibrant Purple
    '#ff0099', // Vibrant Magenta
    '#00cccc', // Vibrant Cyan
    '#cc6600', // Vibrant Brown
  ],
  monochrome: [
    '#1f2937', // Gray 800
    '#374151', // Gray 700
    '#4b5563', // Gray 600
    '#6b7280', // Gray 500
    '#9ca3af', // Gray 400
    '#d1d5db', // Gray 300
    '#e5e7eb', // Gray 200
    '#f3f4f6', // Gray 100
  ],
  cool: [
    '#0ea5e9', // Sky Blue
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Violet
    '#a855f7', // Purple
  ],
  warm: [
    '#f59e0b', // Amber
    '#f97316', // Orange
    '#ef4444', // Red
    '#ec4899', // Pink
    '#dc2626', // Red 600
    '#ea580c', // Orange 600
    '#f59e0b', // Amber 500
    '#fbbf24', // Amber 400
  ],
};

// Get colors from a specific scheme
export const getColorsFromScheme = (scheme = 'default', count = 8) => {
  const colors = colorSchemes[scheme] || colorSchemes.default;
  // If we need more colors than available, repeat the palette
  if (count <= colors.length) {
    return colors.slice(0, count);
  }
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  return result;
};

// Generate colors with alpha for transparency
export const getColorsWithAlpha = (scheme = 'default', count = 8, alpha = 1) => {
  const colors = getColorsFromScheme(scheme, count);
  if (alpha === 1) return colors;

  return colors.map(color => {
    // Convert hex to rgba
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });
};
