# Agent Response Algorithm

https://www.mermaidchart.com/app/projects/34fd5fb1-b18a-4f6a-bc9f-7343dd5309c9/diagrams/561bbb90-690a-43a5-b4b3-8601dfedf759/version/v0.1/edit

## Assumptions:

- All agents are in every room

## Constraints:

- More than 2 agents should never reply to 1 human

## Todo

- Timestamps
- Qualify the conversation

## Scenarios

### Human To agent:

**Problem:** How many times should agents respond

```

Ajax: Hello I am gorgeous

Designer Don (bot): You are, I agree

Engineering Ed (bot): No you are not according to engineering
```

### Lots of User conversation

Problem: If users are talking fast in quick succession, we shouldn’t generate an Agent response for each one

```
Ajax: Hello I am gorgeous

Lisa: You are, I agree

Travis: No you are not according to engineering

Lisa: Fuck you ed
```
