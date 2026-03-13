## ADDED Requirements

### Requirement: Settings popup uses horizontal chip rows
The settings popup SHALL display each setting section (permission mode, model, effort level) as a row of horizontally-arranged tappable chips rather than a vertical radio list.

#### Scenario: All three sections visible at once
- **WHEN** the user opens the settings popup
- **THEN** all three sections (mode, model, effort) are visible simultaneously without scrolling in the common case (≤6 options per section)

#### Scenario: Selected option is visually distinguished
- **WHEN** an option chip is the currently selected value
- **THEN** it renders with a filled/highlighted background distinct from unselected chips

#### Scenario: Tapping a chip selects it
- **WHEN** the user taps an unselected chip
- **THEN** that option becomes selected, the popup closes, and the change is applied

#### Scenario: Chip row scrolls horizontally when options overflow
- **WHEN** a section has more options than fit in the popup width
- **THEN** the chip row scrolls horizontally to reveal additional options

### Requirement: Option descriptions are not shown in the popup
The settings popup SHALL NOT render per-option description text inside the popup view.

#### Scenario: Popup contains only section titles and chips
- **WHEN** the settings popup is open
- **THEN** each section shows only its title and a row of chips with option names — no description paragraphs
