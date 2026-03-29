## ADDED Requirements

### Requirement: Resolve with AI action on conflict screen
When a merge attempt results in conflicts, the merge screen SHALL present a "Resolve with AI" action that resumes the worktree session with a conflict resolution prompt auto-sent on navigate.

The action SHALL:
- Be available whenever the merge step state is `'conflict'`
- Navigate to the existing worktree session via `/session/{sessionId}` with an `autoSendMessage` param
- The message SHALL instruct the agent to: (1) run `git merge main` from the worktree directory, (2) resolve conflicts in the listed files, (3) stage and commit the resolution, (4) reply "Ready to merge" when done
- Include the list of conflicting files in the prompt
- The merge screen SHALL re-run all prechecks on mount so navigating back automatically retries

#### Scenario: User taps Resolve with AI on conflict screen
- **WHEN** the merge step is `'conflict'` and the user taps "Resolve with AI"
- **THEN** the app navigates to `/session/{sessionId}` with `autoSendMessage` set to the conflict resolution prompt containing the conflicting file names

#### Scenario: Agent completes resolution and user navigates back
- **WHEN** the user navigates back to the merge screen after the agent has committed a resolution
- **THEN** the merge screen re-runs prechecks and if no conflicts remain, advances to the `'preview'` step

#### Scenario: Session is inactive when Resolve with AI is tapped
- **WHEN** the worktree session is not active (`session.active === false`) and the user taps "Resolve with AI"
- **THEN** the app navigates to the session with the message pre-filled in the input instead of auto-sent, matching `initialMessage` behaviour
