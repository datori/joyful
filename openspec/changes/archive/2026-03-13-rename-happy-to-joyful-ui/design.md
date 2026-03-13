## Context

The app's 10 translation files (`packages/joyful-app/sources/text/translations/*.ts`) contain user-visible strings that still reference "Happy Coder" and "Happy" from the upstream fork. This is a text-only branding change with no architectural decisions involved.

## Goals / Non-Goals

**Goals:**
- Replace all user-visible "Happy Coder" → "Joyful Coder" and "Happy" → "Joyful" in translation string values
- Cover all 10 language files consistently

**Non-Goals:**
- Renaming translation key names (e.g., `notValidHappyServer` key stays as-is)
- Updating CLI terminal output
- Updating internal variable or function names
- Updating package descriptions or README

## Decisions

**Text replacement only, not key renaming**: Translation keys are internal identifiers. Renaming them would require coordinated changes across the translation system and all call sites. The string values are what users see; keys are implementation detail.

**All 10 language files**: Non-English translations embed "Happy"/"Happy Coder" as the brand name within local-language sentences. The brand name is replaced consistently regardless of surrounding language.

## Risks / Trade-offs

No risks. Pure string value substitution in static translation files with no runtime or behavioral effects.
