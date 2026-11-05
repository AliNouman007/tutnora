# 0002. Playbook served by the server

- Status: Accepted
- Date: 2026-11-05

## Context

The tutor's behaviour (onboarding, roadmap research, teaching, assessment, and session flow) must be the same in every assistant. Claude Code supports Agent Skills, but support for skills in ChatGPT Work has not been verified. Instructions that only some assistants load would make the tutor inconsistent.

## Decision

The tutor playbook lives in `playbook/` as English markdown, is bundled into the Worker, and is delivered through MCP:

- The server's MCP `instructions` tell the assistant to call `start_session` first and to read the relevant playbook sections.
- `get_playbook` returns one section at a time, so assistants load only what they need.
- `start_session` returns the playbook version, so behaviour changes can be traced.

The tutor speaks the learner's preferred language regardless of the playbook's language.

An optional Claude Code skill may be added later as a thin wrapper that points to the same server. It must not duplicate playbook content.

## Alternatives considered

- **A skill for each assistant.** Duplicates content, drifts over time, and depends on unverified skill support in ChatGPT Work.
- **Instructions pasted into each assistant's settings.** Cannot be updated centrally or versioned.
- **Hard-coded prompts in tool responses.** Mixes product content with code and makes review harder.

## Consequences

- One source of truth for tutor behaviour; an update reaches every assistant on deployment.
- Assistants may not always follow server instructions. Reliability must be checked through the manual scenarios in `scenarios/` and real use.
- Playbook changes are product changes and follow the normal review process.
