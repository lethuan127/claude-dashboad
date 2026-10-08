# Claude Dashboard

A local web app that shows your Claude Code usage: sessions, tokens and cost.
The server reads the Claude Code logs in `~/.claude/projects/*/*.jsonl`.
It runs on your machine only. It has no login and no deploy.

## Run it

```sh
npm install
npm run dev
```

Then open http://localhost:3000.

## Check

Run this before you push:

```sh
npm install && npm run lint && npm test && npm run build
```
