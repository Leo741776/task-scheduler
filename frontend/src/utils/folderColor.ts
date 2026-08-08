export const FOLDER_COLOR_TOKENS = [
  'sky',
  'green',
  'lime',
  'rose',
  'mocha',
  'indigo',
  'teal',
  'magenta',
  'pink',
  'slate',
] as const;

export type FolderColorToken = typeof FOLDER_COLOR_TOKENS[number];

export const DEFAULT_FOLDER_COLOR: FolderColorToken = 'sky';

/** 8 token-based folder colors. Cool/neutral biased so they don't overlap the warm
 * priority palette. Backend validates the token via Literal; frontend maps to hex. */
export const FOLDER_COLOR_HEX: Record<FolderColorToken, string> = {
  sky:    '#7CC4FF',
  green:  '#368a56',
  lime: '#32CD32',
  rose:   '#E11D48',
  mocha:  '#8D6E63',
  indigo: '#6366F1',
  teal:   '#26C6DA',
  magenta: '#f326f3',
  pink:   '#F48FB1',
  slate:  '#90A4AE',
};

export function getFolderColor(token?: string | null): string {
  if (token && (FOLDER_COLOR_TOKENS as readonly string[]).includes(token)) {
    return FOLDER_COLOR_HEX[token as FolderColorToken];
  }
  return FOLDER_COLOR_HEX[DEFAULT_FOLDER_COLOR];
}
