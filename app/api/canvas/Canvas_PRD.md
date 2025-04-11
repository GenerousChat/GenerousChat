**Product Requirements Document (PRD)**

---

## **1. Overview**

The Canvas Visualization System enables users to input natural language prompts and generate dynamic, interactive visualizations such as schedules, charts, timelines, maps, or custom UI components. It combines OpenAI's generative capabilities with a structured template system and React rendering engine, allowing users to generate React components and JSX visualizations, validate them with Zod schemas, and render them using Babel transpilation in a secure sandbox environment.

Target users include developers, content creators, analysts, media teams, and technical stakeholders who want to rapidly prototype or render visualization components based on conversational input.

---

## **2. Goals & Objectives**

- Enable prompt-to-visualization generation in seconds with intelligent template selection
- Support reusable, templatized components with Zod schema validation
- Render React/JSX components safely using Babel transpilation
- Validate inputs with Zod schemas to ensure robust component rendering
- Store all templates, tools, and generations in Supabase for transparency
- Support fallback and confidence-based flow control
- Provide version-controlled, multi-template architecture

---

## **3. Key Features**

### 3.1 Intent Analysis & Template Selection

- Analyzes user prompts to determine visualization intent
- Uses confidence-based matching to select templates
- Falls back to HTML generation when confidence is low

### 3.2 Multi-Template Architecture

- Each template lives in its own folder with:
  - `template_config.json`
  - `schema.ts` (Zod validation)
  - `preview.tsx` (example usage)
  - `fallback.html` (fallback visualization)
- Dynamically loaded at runtime via `templateId`

### 3.3 Confidence-Based Template Selection

- LLM selects the most relevant template/tool using `generateObject`
- Selection returns a `confidence` score (0–1)
- Below-threshold selections trigger a fallback mechanism

### 3.4 Tool System

- Visualization libraries or utilities attached to templates
- Tools registered and stored in Supabase
- Optional `config_schema` for parameter customization

### 3.5 Trigger System

- Maps phrases or keywords to templates/tools for intelligent routing
- Matchers stored as JSON logic (`includes`, `startsWith`, etc.)

### 3.6 Prop-Type Validation (Zod)

- Each template exports a Zod schema describing its props
- After data generation, props are validated before rendering

### 3.7 JSX Renderer (via Babel)

- JSX transpilation using `@babel/standalone`
- Transpiled code runs in a sandboxed React component
- Props injected into the rendered component

### 3.8 Supabase Integration

- All templates, tools, triggers, and generations stored in Supabase
- RLS + Auth policies enforced
- CLI-based sync from file system into database

### 3.9 Admin & Preview UI

- Editor for template configs, schema definitions, and testing
- Live preview of generated components for any input
- Admin dashboard for reviewing past generations

### 3.10 Fallback Logic

- Confidence below threshold → use `fallback_html` from config
- Store fallback flag in generation metadata
- Display errors or suggest user to refine prompt

---

## **4. Tech Stack**

### ⚙️ Core Technologies

- **Next.js** – Serverless routing and rendering
- **React** – Component-based UI architecture
- **OpenAI via Vercel AI SDK** – LLM interface
- **Supabase** – Postgres + Auth + Edge Functions
- **Zod** – Schema validation
- **@babel/standalone** – Browser-based JSX transpilation

### 🎨 UI Frameworks

- **TailwindCSS** – Utility-first styling
- **shadcn/ui** – Modular UI primitives for editor/admin views

### 📦 File & Folder Layout

```
/templates/
  /scheduler_template/
    template_config.json
    schema.ts
    preview.tsx
    fallback.html
    README.md

/api/canvas/
  generate-visualization.ts
  templates.ts
  template-preview.ts

/lib/
  selectTemplate.ts
  validateProps.ts
  loadTemplate.ts
  renderJSX.ts
  useSupabase.ts
  openaiClient.ts
```

---

## **5. Template Config Schema**

```json
{
  "id": "scheduler_template",
  "name": "Weekly Scheduler",
  "type": "component",
  "description": "Generates a weekly schedule UI with date + label items.",
  "tags": ["calendar", "schedule", "planner"],
  "zod_schema": "SchedulerProps",
  "tool": "calendarRenderer",
  "confidence_threshold": 0.75,
  "template": "<Scheduler activities={{{activities}}} />",
  "example_prompt": "Make me a 5-day workout schedule",
  "example_props": {
    "activities": [
      { "date": "Monday", "label": "Yoga" },
      { "date": "Tuesday", "label": "Cardio" }
    ]
  },
  "fallback_html": "<p>Sorry, we couldn't generate that.</p>"
}
```

---

## **6. Database Schema**

### `canvas_templates`

| Field                | Type      | Example                                       |
| -------------------- | --------- | --------------------------------------------- |
| id                   | UUID      | `uuid_generate_v4()`                          |
| name                 | TEXT      | "Weekly Scheduler"                            |
| type                 | TEXT      | "component"                                   |
| template             | TEXT      | `"<Scheduler activities={{{activities}}} />"` |
| description          | TEXT      | "Creates a weekly workout calendar"           |
| tags                 | TEXT[]    | `["calendar", "schedule"]`                    |
| zod_schema           | TEXT      | "SchedulerProps"                              |
| confidence_threshold | FLOAT     | 0.75                                          |
| fallback_html        | TEXT      | `"<p>Fallback content</p>"`                   |
| created\_by          | UUID      | `auth.users.id`                               |
| created\_at          | TIMESTAMP | `NOW()`                                       |

### `canvas_tools`

| Field          | Type      | Example                                                                  |
| -------------- | --------- | ------------------------------------------------------------------------ |
| id             | UUID      | `uuid_generate_v4()`                                                     |
| name           | TEXT      | "calendarRenderer"                                                       |
| description    | TEXT      | "Script to render calendars"                                             |
| category       | TEXT      | "library"                                                                |
| script\_url    | TEXT      | `"https://cdnjs.com/calendar-renderer"`                                  |
| config\_schema | JSONB     | `{ "type": "object", "properties": { "startDate": {"type": "string"} }}` |
| created\_at    | TIMESTAMP | `NOW()`                                                                  |

### `canvas_triggers`

| Field        | Type      | Example                                   |
| ------------ | --------- | ----------------------------------------- |
| id           | UUID      | `uuid_generate_v4()`                      |
| name         | TEXT      | "Schedule Keywords"                       |
| template\_id | UUID      | `scheduler_template_uuid`                 |
| tool\_id     | UUID      | `calendar_tool_uuid`                      |
| matcher      | JSONB     | `{ "includes": ["schedule", "workout"] }` |
| created\_at  | TIMESTAMP | `NOW()`                                   |

### `canvas_generations`

| Field           | Type      | Example                                                          |
| --------------- | --------- | ---------------------------------------------------------------- |
| id              | UUID      | `uuid_generate_v4()`                                             |
| canvas\_id      | TEXT      | "canvas-123"                                                     |
| template\_id    | TEXT      | "scheduler_template"                                             |
| component\_code | TEXT      | `"const Scheduler = (props) => { return <div>...</div> }"`       |
| component\_data | JSONB     | `{ "activities": [{"date": "Monday", "label": "Yoga"}] }`        |
| html            | TEXT      | `"<div>Fallback HTML</div>"`                                     |
| confidence      | FLOAT     | 0.92                                                             |
| render\_method  | TEXT      | "jsx"                                                            |
| summary         | TEXT      | "Generated weekly schedule"                                      |
| created\_by     | UUID      | `auth.users.id`                                                  |
| type            | TEXT      | "visualization"                                                  |
| metadata        | JSONB     | `{ "confidence": 0.92, "tool": "calendarRenderer" }`             |
| created\_at     | TIMESTAMP | `NOW()`                                                          |

### `canvas_messages`

| Field       | Type      | Example                       |
| ----------- | --------- | ----------------------------- |
| id          | UUID      | `uuid_generate_v4()`          |
| canvas\_id  | TEXT      | "canvas-123"                  |
| user\_id    | UUID      | `auth.users.id`               |
| content     | TEXT      | "Make me a workout schedule"  |
| created\_at | TIMESTAMP | `NOW()`                       |

---

## **7. Input/Output Examples**

### Template Selection Request to OpenAI

```json
{
  "prompt": "Analyze this user request and select the most appropriate template",
  "conversation": ["User: Make me a workout schedule for weekdays"],
  "availableTemplates": [
    {"id": "scheduler_template", "tags": ["calendar", "schedule", "planner"]},
    {"id": "chart_template", "tags": ["chart", "graph", "data"]},
    {"id": "map_template", "tags": ["map", "location", "geography"]}
  ]
}
```

### Template Selection Response from OpenAI

```json
{
  "templateId": "scheduler_template",
  "confidence": 0.94,
  "reasoning": "The user is asking for a workout schedule, which aligns with the scheduler_template that has tags for 'calendar', 'schedule', and 'planner'."
}
```

### Data Generation Request to OpenAI

```json
{
  "template": "scheduler_template",
  "userPrompt": "Make me a workout schedule for weekdays."
}
```

### Data Generation Response from OpenAI

```json
{
  "activities": [
    { "date": "Monday", "label": "Cardio" },
    { "date": "Tuesday", "label": "Upper Body Strength" },
    { "date": "Wednesday", "label": "Rest" },
    { "date": "Thursday", "label": "Yoga" },
    { "date": "Friday", "label": "HIIT" }
  ]
}
```

### Zod Schema for `Scheduler`

```ts
import { z } from 'zod';

export const SchedulerProps = z.object({
  activities: z.array(
    z.object({
      date: z.string(),
      label: z.string(),
    })
  )
});
```

### JSX Component Generated

```jsx
const SchedulerComponent = (props) => {
  const { activities } = props;
  
  return (
    <div className="scheduler-container">
      <h2 className="text-xl font-bold mb-4">Weekly Workout Schedule</h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {activities.map((activity, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="font-bold text-gray-700">{activity.date}</div>
            <div className="text-lg mt-1">{activity.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## **8. Confidence Threshold & Fallback Strategy**

- Templates include a `confidence_threshold` in their config (default: 0.75)
- If template selection confidence is below threshold:
  - System tries alternative templates
  - If all below threshold, uses fallback HTML
- If data validation fails:
  - System attempts to fix data
  - If unfixable, uses fallback HTML
- If JSX rendering fails:
  - System renders fallback HTML
- Confidence and fallback status stored in `canvas_generations.metadata`

---

## **9. System Flow**

### Template-Based Visualization Flow

```
User Prompt → Intent Analysis → Template Selection → Data Generation → Zod Validation → JSX Generation → Babel Transpilation → React Rendering
```

### Fallback Flow

```
Intent Analysis Fails → Generate Direct HTML → Render in iframe
```

OR

```
Template Selection Succeeds → Data Generation Fails → Use Template's Fallback HTML → Render in iframe
```

---

## **10. Key User Journeys**

### 1. First-time Visualization
1. User enters prompt: "Create a timeline of Apollo missions"
2. System analyzes intent and selects "timeline_template"
3. System generates data for Apollo missions
4. Data is validated against the Timeline Zod schema
5. JSX is generated and transpiled with Babel
6. User sees interactive timeline component
7. User can hover/click on timeline events

### 2. Iterative Refinement
1. User enters follow-up: "Add more detail to the Apollo 11 mission"
2. System retains previous template selection
3. System augments existing data with new details
4. Updated JSX is generated and rendered
5. User sees enhanced timeline with expanded Apollo 11 section

### 3. Template Fallback
1. User enters ambiguous prompt: "Show me something interesting"
2. System cannot confidently select a template
3. System falls back to direct HTML generation
4. User sees basic visualization with suggestion to be more specific

---

## **11. Admin & Developer Workflows**

### Template Creation Workflow
1. Create template folder structure
2. Define template_config.json
3. Create Zod schema for props
4. Create preview component
5. Add fallback HTML
6. Run sync command to update database
7. Test template with sample prompts

### Template Management Flow
1. Access admin interface
2. View all registered templates
3. Edit template configurations
4. Test template with sample prompts
5. View analytics on template usage and performance
6. Publish or unpublish templates

---

## **12. Success Metrics**

- **Template Selection Accuracy**: % of prompts matched to correct template
- **Generation Success Rate**: % of visualizations generated without fallback
- **Render Performance**: Time from prompt to rendered visualization
- **User Satisfaction**: Rating of how well visualization matched intent
- **Template Coverage**: % of visualization requests that have matching templates

