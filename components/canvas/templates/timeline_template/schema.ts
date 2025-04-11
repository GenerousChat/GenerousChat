import { z } from 'zod';

const TimelineEventSchema = z.object({
  date: z.string().min(1, "Date is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  image: z.string().url().optional(),
  link: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  highlighted: z.boolean().optional(),
});

export const TimelineProps = z.object({
  events: z.array(TimelineEventSchema).min(1, "At least one event is required"),
  options: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    layout: z.enum(['vertical', 'horizontal']).optional().default('vertical'),
    colorTheme: z.enum(['blue', 'green', 'purple', 'red', 'orange', 'gray']).optional().default('blue'),
    enableZoom: z.boolean().optional().default(true),
    showLabels: z.boolean().optional().default(true),
    groupByYear: z.boolean().optional().default(false),
    dateFormat: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional(),
    scale: z.enum(['linear', 'logarithmic']).optional().default('linear'),
    navigationControls: z.boolean().optional().default(true),
  }).optional(),
  categories: z.array(
    z.object({
      name: z.string(),
      color: z.string().optional(),
    })
  ).optional(),
});

export type TimelinePropsType = z.infer<typeof TimelineProps>; 