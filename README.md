# hookprobe

**Verify git hooks are actually installed before agents skip them.**

Coding agents often commit with broken or missing husky/`core.hooksPath` setup. HookProbe checks offline and writes JSON/Markdown for humans and agents.

```bash
npm install && npm run build
npx hookprobe . --out ./hookprobe-report --fail
```

## License

MIT
