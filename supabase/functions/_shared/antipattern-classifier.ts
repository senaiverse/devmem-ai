import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createGeminiClient, promptGemini } from './gemini-client.ts';

/** Classification result from the antipattern analysis. */
interface ClassificationResult {
  risk_level: 'none' | 'low' | 'medium' | 'high';
  antipattern_name: string | null;
  antipattern_reason: string | null;
}

const VALID_RISK_LEVELS = ['none', 'low', 'medium', 'high'] as const;

const DEFAULT_RESULT: ClassificationResult = {
  risk_level: 'none',
  antipattern_name: null,
  antipattern_reason: null,
};

/**
 * Classifies a lesson for antipattern risk using Gemini.
 * Non-fatal: returns defaults on failure so callers never crash.
 */
export async function classifyLesson(fields: {
  title: string;
  problem: string | null;
  root_cause: string | null;
  solution: string | null;
  recommendation: string | null;
  tags: string[];
}): Promise<ClassificationResult> {
  try {
    const client = createGeminiClient();
    const prompt = `You are a software architecture reviewer. Analyze this lesson and determine if it describes a software antipattern, technical debt, or risky practice.

Lesson title: ${fields.title}
Problem: ${fields.problem || 'N/A'}
Root cause: ${fields.root_cause || 'N/A'}
Solution: ${fields.solution || 'N/A'}
Recommendation: ${fields.recommendation || 'N/A'}
Tags: ${fields.tags.join(', ') || 'none'}

Return a JSON object with:
- risk_level: "none" | "low" | "medium" | "high" (none = not an antipattern, low = minor code smell, medium = notable risk, high = critical antipattern. Most lessons should be "none".)
- antipattern_name: string or null (canonical name like "God Object", "Shotgun Surgery", "Premature Optimization". null if risk_level is "none")
- antipattern_reason: string or null (1-2 sentence explanation. null if risk_level is "none")

Return ONLY the JSON object, no markdown fencing.`;

    const responseText = await promptGemini(client, prompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return DEFAULT_RESULT;

    const parsed = JSON.parse(jsonMatch[0]);
    const riskLevel = VALID_RISK_LEVELS.includes(parsed.risk_level)
      ? parsed.risk_level
      : 'none';

    return {
      risk_level: riskLevel,
      antipattern_name: riskLevel === 'none' ? null : (parsed.antipattern_name || null),
      antipattern_reason: riskLevel === 'none' ? null : (parsed.antipattern_reason || null),
    };
  } catch (err) {
    console.error('Antipattern classification failed (non-fatal):', err);
    return DEFAULT_RESULT;
  }
}

/**
 * Persists a classification result to the lessons table.
 */
export async function persistClassification(
  supabase: SupabaseClient,
  lessonId: string,
  result: ClassificationResult
): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({
      risk_level: result.risk_level,
      antipattern_name: result.antipattern_name,
      antipattern_reason: result.antipattern_reason,
    })
    .eq('id', lessonId);

  if (error) {
    console.error(`Failed to persist classification for ${lessonId}:`, error);
  }
}
