import { z } from 'zod';

export const SchedulerProps = z.object({
  activities: z.array(
    z.object({
      date: z.string().min(1, "Date is required"),
      label: z.string().min(1, "Label is required"),
      description: z.string().optional(),
      color: z.string().optional(),
      time: z.string().optional(),
      duration: z.string().optional(),
      complete: z.boolean().optional(),
    })
  ).min(1, "At least one activity is required"),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  colorTheme: z.enum(['blue', 'green', 'purple', 'red', 'orange', 'gray']).optional(),
  showWeekends: z.boolean().optional().default(true),
  layout: z.enum(['vertical', 'horizontal', 'grid']).optional().default('grid'),
});

export type SchedulerPropsType = z.infer<typeof SchedulerProps>; 