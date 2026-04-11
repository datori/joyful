yarn codex:sessions                          # recent 20, all sources
yarn codex:sessions --mcp                    # only joyful-launched
yarn codex:sessions --cwd .                  # current directory only
yarn codex:sessions --search "codex"         # search titles & first messages
yarn codex:sessions --all                    # no limit
yarn codex:sessions show abcd1234            # details (partial ID works)
yarn codex:sessions resume abcd1234          # resume by ID
yarn codex:sessions fork abcd1234            # fork by ID
