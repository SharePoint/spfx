import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const minimalPropertiesSchema: z.ZodObject<{ name: z.ZodString }> = z.object({
  name: z.string().describe('The name of the person to greet.')
});

export type IMinimalCopilotComponentProperties = z.infer<typeof minimalPropertiesSchema>;

export default zodToJsonSchema(minimalPropertiesSchema);
