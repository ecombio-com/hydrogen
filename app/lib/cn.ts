import {createCn} from 'cn/config';

/**
 * Project-wide `cn`. Every `import {cn} from 'cn'` resolves here (see vite.config.ts).
 *
 * Our design-system font sizes (text-ds-h1 … text-ds-tiny) are custom, so the stock
 * merger mistook them for text colors and dropped real colors such as
 * text-primary-foreground (black text on black buttons). Registering them as
 * font sizes keeps size and color side by side.
 */
const DS_FONT_SIZES = ['h1', 'h2', 'h3', 'h4', 'h5', 'large', 'medium', 'regular', 'small', 'tiny'].map(
  (s) => `ds-${s}`,
);

export const cn = createCn({
  extend: {classGroups: {'font-size': [{text: DS_FONT_SIZES}]}},
});

export default cn;
