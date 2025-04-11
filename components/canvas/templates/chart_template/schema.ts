import { z } from 'zod';

const DatasetSchema = z.object({
  label: z.string(),
  data: z.array(z.number()),
  backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
  borderColor: z.union([z.string(), z.array(z.string())]).optional(),
  borderWidth: z.number().optional(),
  fill: z.boolean().optional(),
  tension: z.number().optional(),
});

export const ChartProps = z.object({
  type: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea', 'scatter', 'bubble']),
  data: z.object({
    labels: z.array(z.string()),
    datasets: z.array(DatasetSchema).min(1, "At least one dataset is required"),
  }),
  options: z.object({
    responsive: z.boolean().optional().default(true),
    maintainAspectRatio: z.boolean().optional().default(true),
    plugins: z.object({
      title: z.object({
        display: z.boolean().optional(),
        text: z.string().optional(),
      }).optional(),
      legend: z.object({
        display: z.boolean().optional(),
        position: z.enum(['top', 'left', 'bottom', 'right']).optional(),
      }).optional(),
      tooltip: z.object({
        enabled: z.boolean().optional(),
      }).optional(),
    }).optional(),
    scales: z.object({
      x: z.object({
        title: z.object({
          display: z.boolean().optional(),
          text: z.string().optional(),
        }).optional(),
        grid: z.object({
          display: z.boolean().optional(),
        }).optional(),
        beginAtZero: z.boolean().optional(),
      }).optional(),
      y: z.object({
        title: z.object({
          display: z.boolean().optional(),
          text: z.string().optional(),
        }).optional(),
        grid: z.object({
          display: z.boolean().optional(),
        }).optional(),
        beginAtZero: z.boolean().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  theme: z.enum(['light', 'dark']).optional().default('light'),
});

export type ChartPropsType = z.infer<typeof ChartProps>; 