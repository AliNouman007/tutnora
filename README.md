# Tutnora

**Your Personal AI Learning Companion**

Tutnora turns the AI assistant you already use into a persistent personal tutor. Connect it to ChatGPT or Claude Code, tell it what you want to learn, and it builds a researched roadmap, teaches topic by topic, checks your understanding, and remembers your progress across sessions and devices.

> **Status:** Pre-alpha. Under active development. Not yet available for public use.

## Why Tutnora

AI assistants explain things well, but they forget. Every new chat starts from zero: what you learned, where you struggled, and what you should revise are lost.

Tutnora keeps that memory, and keeps it honest:

- **Persistent progress.** Your goals, roadmap, and learning history are saved and available from any connected assistant.
- **Evidence, not checkboxes.** A topic counts as learned only after you have demonstrated it. Progress is calculated from your actual answers and is never written directly by the AI.
- **Spaced revision.** Learned topics return for short reviews at increasing intervals, so you remember them when it matters.
- **A consistent tutor.** Every connected assistant follows the same teaching playbook: a proper definition first, then explanation, examples, practice, and assessment matched to the topic's importance.

## How it works

Tutnora is a remote [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server called `tutnora-mcp`. Your AI assistant connects to it and gains a small set of tools: start a session, read the tutor playbook, save a roadmap, record evidence of learning, end a session, and view, export, or delete your data.

```text
You ⇄ ChatGPT / Claude Code ⇄ tutnora-mcp ⇄ your private learning record
```

You sign in with GitHub. Other learners cannot see your data.

## MVP scope

The first version includes:

- GitHub sign-in (invite-only during the MVP)
- Multiple learning goals per learner, without overwriting earlier progress
- Researched roadmaps, with each topic ranked as core, working, or awareness
- Evidence-based progress and spaced revision
- Session handoff, so each session continues where the last one ended
- Export and permanent deletion of your data

Planned for later: an in-chat progress view, deeper project-based and AI-assisted (agentic) learning modes, and more sign-in providers.

## Connecting

Instructions for ChatGPT and Claude Code will be published after the first staging deployment.

## Documentation

| Document | Purpose |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, layers, data model, and tools |
| [Decision records](docs/decisions/README.md) | Why key technical decisions were made |

Development, testing, security, and privacy documentation will be added as the project foundation is completed.

## License

[MIT](LICENSE)
