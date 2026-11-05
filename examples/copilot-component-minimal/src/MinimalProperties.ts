import { z } from 'zod';

const propertiesSchema = z.object({
  message: z.string().describe('A message to display.')
});

export type IMinimalCopilotComponentProperties = z.infer<typeof propertiesSchema>;

export default propertiesSchema.toJSONSchema();
