// The look plan, in one place. Six values and one accent hue; the lighting makes every
// shade the game needs, so no other colour appears in the code. The same six names are
// the CSS custom properties in index.html.
export const PALETTE = {
  canvas: '#4b5157',
  surface: '#666e77',
  hairline: '#7e8791',
  ink: '#f6f4ef',
  muted: '#b7bfc8',
  accent: '#ffb84d',
};

export function shade(name) {
  return PALETTE[name];
}
