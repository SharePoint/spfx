import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const <%= componentName.camel %>PropertiesSchema: z.ZodObject<{ name: z.ZodString }> = z.object({
  name: z.string().describe('The name of the person to greet.')
});

export type I<%= componentName.pascal %>CopilotComponentProperties = z.infer<typeof <%= componentName.camel %>PropertiesSchema>;

export default zodToJsonSchema(<%= componentName.camel %>PropertiesSchema);
