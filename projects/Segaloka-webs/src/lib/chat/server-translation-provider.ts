import "server-only";

import type {
  ChatTranslationProvider,
  TranslationRequest,
  TranslationResult,
} from "./multilingual-chat";

const LANGUAGES = new Set(["ID", "EN", "AR"]);

function requireTranslationEndpoint(): URL {
  const raw = process.env.SEGALOKA_TRANSLATION_API_URL;

  if (!raw) {
    throw new Error("Translation service is not configured.");
  }

  const url = new URL(raw);

  if (url.protocol !== "https:") {
    throw new Error("Translation endpoint must use HTTPS.");
  }

  return url;
}

export class SegalokaServerTranslationProvider
  implements ChatTranslationProvider
{
  async translate(
    request: TranslationRequest,
  ): Promise<TranslationResult> {
    if (
      !LANGUAGES.has(request.sourceLanguage) ||
      !LANGUAGES.has(request.targetLanguage) ||
      !request.text.trim()
    ) {
      throw new Error("Invalid translation request.");
    }

    const url = requireTranslationEndpoint();
    const apiKey = process.env.SEGALOKA_TRANSLATION_API_KEY;

    if (!apiKey) {
      throw new Error("Translation credentials are not configured.");
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Translation service request failed.");
    }

    const result: unknown = await response.json();

    if (
      typeof result !== "object" ||
      result === null ||
      !("text" in result) ||
      !("sourceLanguage" in result) ||
      !("targetLanguage" in result) ||
      typeof result.text !== "string" ||
      result.sourceLanguage !== request.sourceLanguage ||
      result.targetLanguage !== request.targetLanguage ||
      !result.text.trim()
    ) {
      throw new Error("Invalid translation service response.");
    }

    return {
      text: result.text,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
    };
  }
}