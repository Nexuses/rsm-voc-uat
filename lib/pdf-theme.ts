export type PdfRgb = [number, number, number];

export const PDF_THEME = {
  navy: [0, 21, 61] as PdfRgb,
  blue: [0, 156, 222] as PdfRgb,
  green: [63, 156, 53] as PdfRgb,
  grey: [136, 139, 141] as PdfRgb,
  charcoal: [35, 31, 32] as PdfRgb,
  body: [99, 102, 106] as PdfRgb,
  muted: [145, 144, 147] as PdfRgb,
  border: [209, 211, 212] as PdfRgb,
  surface: [255, 255, 255] as PdfRgb,
  page: [243, 243, 243] as PdfRgb,
  panel: [243, 244, 248] as PdfRgb,
  track: [232, 237, 240] as PdfRgb,
  white: [255, 255, 255] as PdfRgb,
  paleGreen: [216, 235, 214] as PdfRgb,
  paleBlue: [204, 235, 248] as PdfRgb,
  lightGreen: [101, 176, 93] as PdfRgb,
};

export const PDF_PAGE = { width: 210, height: 297, margin: 12 } as const;
