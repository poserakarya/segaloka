import {
  applyChatTranslation,
  requiresTranslation,
  type ChatLanguage,
  type ChatTranslationProvider,
  type MultilingualChatMessage,
  type TranslationResult,
} from "./multilingual-chat";

export type TranslateMessageForLanguageInput = {
  message: MultilingualChatMessage;
  targetLanguage: ChatLanguage;
};

export type TranslateMessageForLanguagesInput = {
  message: MultilingualChatMessage;
  targetLanguages: readonly ChatLanguage[];
};

function hasTranslation(
  message: MultilingualChatMessage,
  language: ChatLanguage,
): boolean {
  const translated =
    message.translations[language];

  return Boolean(
    translated &&
    translated.trim(),
  );
}

function validateTranslationResult(
  result: TranslationResult,
  expectedSourceLanguage: ChatLanguage,
  expectedTargetLanguage: ChatLanguage,
): void {
  if (
    result.sourceLanguage !==
    expectedSourceLanguage
  ) {
    throw new Error(
      "Translation provider returned an unexpected source language.",
    );
  }

  if (
    result.targetLanguage !==
    expectedTargetLanguage
  ) {
    throw new Error(
      "Translation provider returned an unexpected target language.",
    );
  }

  if (!result.text.trim()) {
    throw new Error(
      "Translation provider returned an empty translation.",
    );
  }
}

/**
 * Ensures one message has a representation in the
 * requested viewer language.
 *
 * Important:
 * - originalText is never overwritten.
 * - existing translations are reused.
 * - same-language messages are not translated.
 * - no fake translation is generated.
 */
export async function translateMessageForLanguage(
  provider: ChatTranslationProvider,
  input: TranslateMessageForLanguageInput,
): Promise<MultilingualChatMessage> {
  const {
    message,
    targetLanguage,
  } = input;

  if (
    hasTranslation(
      message,
      targetLanguage,
    )
  ) {
    return message;
  }

  if (
    !requiresTranslation(
      message.originalLanguage,
      targetLanguage,
    )
  ) {
    return {
      ...message,

      translations: {
        ...message.translations,

        [targetLanguage]:
          message.originalText,
      },
    };
  }

  if (!message.originalText.trim()) {
    return message;
  }

  const result =
    await provider.translate({
      text: message.originalText,
      sourceLanguage:
        message.originalLanguage,
      targetLanguage,
    });

  validateTranslationResult(
    result,
    message.originalLanguage,
    targetLanguage,
  );

  return applyChatTranslation(
    message,
    result,
  );
}

/**
 * Generates only the missing language representations.
 *
 * Example:
 * Traveler writes EN.
 * Vendor currently uses ID.
 *
 * We can request ID immediately.
 * AR can be requested later when an Arabic viewer opens
 * the same conversation.
 */
export async function translateMessageForLanguages(
  provider: ChatTranslationProvider,
  input: TranslateMessageForLanguagesInput,
): Promise<MultilingualChatMessage> {
  let message = input.message;

  const uniqueLanguages =
    Array.from(
      new Set(input.targetLanguages),
    );

  for (
    const targetLanguage
    of uniqueLanguages
  ) {
    message =
      await translateMessageForLanguage(
        provider,
        {
          message,
          targetLanguage,
        },
      );
  }

  return message;
}