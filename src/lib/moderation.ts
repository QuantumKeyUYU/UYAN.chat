interface ModerationResult {
  approved: boolean;
  reasons?: string[];
}

export const moderateText = async (_text: string): Promise<ModerationResult> => {
  // TODO: integrate OpenAI moderation endpoint. For MVP we approve everything.
  return {
    approved: true,
  };
};
