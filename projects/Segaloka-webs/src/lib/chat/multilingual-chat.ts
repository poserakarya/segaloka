export type ChatLanguage =
  | "ID"
  | "EN"
  | "AR";

export type ChatParticipantRole =
  | "traveler"
  | "vendor";

export type ChatTranslationMap =
  Partial<
    Record<ChatLanguage, string>
  >;

export type MultilingualChatMessage = {
  id: string;

  senderRole: ChatParticipantRole;

  originalText: string;
  originalLanguage: ChatLanguage;

  translations: ChatTranslationMap;

  createdAt: string;
};

export type TranslationRequest = {
  text: string;
  sourceLanguage: ChatLanguage;
  targetLanguage: ChatLanguage;
};

export type TranslationResult = {
  text: string;
  sourceLanguage: ChatLanguage;
  targetLanguage: ChatLanguage;
};

export interface ChatTranslationProvider {
  translate(
    request: TranslationRequest,
  ): Promise<TranslationResult>;
}

/**
 * Builds the initial translation map.
 *
 * The original text is stored only under its actual
 * source language. No fabricated translation is created.
 */
export function createInitialTranslations(
  text: string,
  language: ChatLanguage,
): ChatTranslationMap {
  if (!text.trim()) {
    return {};
  }

  return {
    [language]: text,
  };
}

/**
 * Returns the message representation for the language
 * currently selected by the viewer.
 *
 * Until a real translation exists, originalText is used.
 */
export function getLocalizedChatText(
  message: Pick<
    MultilingualChatMessage,
    | "originalText"
    | "translations"
  >,
  viewerLanguage: ChatLanguage,
): string {
  return (
    message.translations[viewerLanguage] ??
    message.originalText
  );
}

/**
 * Returns whether translation is actually required.
 */
export function requiresTranslation(
  sourceLanguage: ChatLanguage,
  targetLanguage: ChatLanguage,
): boolean {
  return sourceLanguage !== targetLanguage;
}

/**
 * Adds a real translation result without changing
 * originalText or originalLanguage.
 */
export function applyChatTranslation(
  message: MultilingualChatMessage,
  result: TranslationResult,
): MultilingualChatMessage {
  return {
    ...message,

    translations: {
      ...message.translations,
      [result.targetLanguage]:
        result.text,
    },
  };
}

/**
 * Produces searchable text from the original message
 * and every translation currently available.
 */
export function getChatSearchText(
  message: Pick<
    MultilingualChatMessage,
    | "originalText"
    | "translations"
  >,
): string {
  return [
    message.originalText,
    message.translations.ID,
    message.translations.EN,
    message.translations.AR,
  ]
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    )
    .join(" ")
    .toLocaleLowerCase();
}