## Archived Root Scripts

These scripts were moved out of the repository root to keep the top-level layout focused on the current product surface.

They are preserved because they may still be useful as historical debugging artifacts, but they are not part of the maintained workflow.

- `root-tests/round6`, `root-tests/round7`: historical campaign-specific experiments
- `root-tests/browser`, `mail`, `popup`, `terminal`, `windowing`: one-off manual probes
- `root-tests/verification`: old verification helpers tied to those campaigns

For maintained entry points, use the package scripts in `package.json` or the organized helpers under `scripts/validation`, `scripts/replay`, and `scripts/manual`.
