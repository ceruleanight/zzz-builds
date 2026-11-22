export const languages = [{ code: 'en', name: 'English' }] as const;

export type LanguageCode = (typeof languages)[number]['code'];

export const languageCodes = languages.map((language) => language.code);
