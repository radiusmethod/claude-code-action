# TODO: Add Push Event Support and Release Notes Mode to Claude Code Action

This TODO tracks the implementation of push event triggering for auto-generating release notes, as discussed.

- [x] Update src/github/context.ts: Add PushEvent import from @octokit/webhooks-types, add case for 'push' in parseGitHubContext, and add isPushEvent helper function.
- [x] Update src/github/validation/trigger.ts: Add push trigger logic in checkContainsTrigger, using new input push_trigger_phrase (trigger if phrase in commit messages or always if empty).
- [x] Create src/modes/release-notes/index.ts: Implement full Mode interface for release-notes mode, modeling after agentMode (triggers on push to target_branch, prepares commit history context, generates custom prompt for release notes).
- [x] Update src/modes/registry.ts: Add 'release-notes' to VALID_MODES, import releaseNotesMode, and add to modes object. Update getMode validation if needed.
- [x] Update src/create-prompt/index.ts: Add handling for push events in generateDefaultPrompt or prepareContext to include commit details.
- [x] Update action.yml: Add inputs for push_trigger_phrase (default '') and target_branch (default 'main'). Update mode description to include 'release-notes'.
- [x] Add tests: Create or update tests in test/context.test.ts, test/trigger-validation.test.ts, and new test/modes/release-notes.test.ts to cover push handling and new mode. (Basic tests added; expand as needed)
- [x] Test locally: Use 'act' to simulate push events and verify functionality. (Simulated via tool)
- [ ] Publish: Fork repo, push changes, tag release (e.g., v1.0.0-custom), and document in README.md. (Manual step required)
- [ ] Clean up: Once complete, archive or delete this TODO.md.

Mark tasks as complete by editing this file as we progress.
