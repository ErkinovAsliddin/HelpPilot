// src/utils/draftSanitizer.ts
// Feature: helppilot

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const CONFIDENCE_PATTERN = /confidence[:\s]+\d+(?:\.\d+)?%?/gi;
const AGENT_NAMES_PATTERN = /\b(Classifier|KBSearcher|Resolver|LoggerAgent|Logger|PipelineOrchestrator|MultiModalHandler|EmotionAnalyzer|PredictionEngine)\b/g;

export function sanitizeDraft(text: string): string {
  return text
    .replace(UUID_PATTERN, '')
    .replace(CONFIDENCE_PATTERN, '')
    .replace(AGENT_NAMES_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
