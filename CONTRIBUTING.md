# Contributing to Raahi

1. Read the README, project context, architecture and design guide.
2. Create a focused branch and keep secrets/session keys outside the checkout.
3. Preserve honest demo/live labels and backend validation.
4. Run `pnpm typecheck`, `pnpm test:flow` and `pnpm build`.
5. For UI changes, inspect desktop and mobile. For workflow changes, exercise the full lifecycle and relevant failure cases.
6. Describe the concrete before/after behavior, validation and any remaining limitations in the pull request.
7. Update API/context/design documentation when their contracts change. Append migrations; never rewrite an applied migration.

Do not force-push, change repository visibility, publish deployments or provision paid services without the owner's instructions. Public visibility is not a license grant; confirm rights before redistributing original project assets.
