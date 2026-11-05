import { z } from 'zod';

const propertiesSchema = z.object({
  message: z.string().describe('A message to display.')
});

export type I<%= componentName.pascal %>CopilotComponentProperties = z.infer<typeof propertiesSchema>;

export default propertiesSchema.toJSONSchema();
