## PR preparation: Extend x402 to Polygon PoS and Polygon Amoy

### What changed (high-signal summary)

- TypeScript (x402 core)
  - `typescript/packages/x402/src/types/shared/network.ts`
    - Added networks: `polygon` (137), `polygon-amoy` (80002)
    - Updated `NetworkSchema`, `SupportedEVMNetworks`, `EvmNetworkToChainId`, and `ChainIdToNetwork`
  - `typescript/packages/x402/src/types/shared/evm/config.ts`
    - Added USDC config:
      - 137 → `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359` (USD Coin)
      - 80002 → `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` (USDC)
  - `typescript/packages/x402/src/types/shared/evm/wallet.ts`
    - Mapped `polygon` to `viem/chains` Polygon chain
    - Added a custom `polygon-amoy` chain object
  - `typescript/site/app/facilitator/supported/route.ts`
    - Added entries for `polygon-amoy` and `polygon`
  - Tests: `typescript/packages/x402/src/shared/middleware.test.ts`
    - Added assertions for Polygon and Polygon Amoy default asset resolution
  - Scripts (for local validation; not meant for final PR):
    - `scripts/gen_amoy_payment.ts` (generate X-PAYMENT header)
    - `scripts/verify_amoy_local.ts` (local on-chain verification using viem)

- Python
  - `python/x402/src/x402/networks.py`
    - Added `polygon` and `polygon-amoy` to `SupportedNetworks` and `EVM_NETWORK_TO_CHAIN_ID`
  - `python/x402/src/x402/chains.py`
    - Added `NETWORK_TO_ID` entries for 137 and 80002
    - Added `KNOWN_TOKENS` entries with the above USDC addresses, names, decimals (6), and version ("2")
  - Tests: added `python/x402/tests/test_chains_polygon.py` (focused unit tests for Polygon IDs and tokens)

- Go
  - `go/pkg/gin/middleware.go`
    - Added `WithNetwork(network string)` and `WithAsset(asset string)` options
    - Selection logic now supports `polygon` and `polygon-amoy` defaults (keeps Base/Base-Sepolia legacy)
  - Tests: `go/pkg/gin/middleware_test.go`
    - Added Polygon/Amoy selection cases and custom-asset case

- Demo / Docs
  - `demo/polygon_extension_implementation.md` with full plan and execution checklist

- Validation highlights
  - TypeScript tests: 90/90 passing
  - Go tests: `ok` for all packages (including new gin tests)
  - Python: focused Polygon tests passed
  - Local on-chain verification (Polygon Amoy): success via `verify_amoy_local.ts`
  - Public facilitator `/verify` returned `invalid_payload` for Polygon Amoy (likely unsupported there yet); our local verification confirms the integration works

---

### Tasks to prepare and submit the PR

- Cleanup: temporary/auxiliary files
  - [ ] Delete TypeScript helper scripts used only for local validation
    - [ ] `typescript/packages/x402/scripts/gen_amoy_payment.ts`
    - [ ] `typescript/packages/x402/scripts/verify_amoy_local.ts`
  - [ ] Delete the focused Python test added for quick validation (keep changes in existing test files only)
    - [ ] `python/x402/tests/test_chains_polygon.py`

- Remove unintended submodule (`A2A`)
  - [ ] De-initialize and remove the submodule from the repo index
    - [ ] `git submodule deinit -f A2A`
    - [ ] `git rm -f A2A`
  - [ ] Remove the `A2A` entry in `.gitmodules` if present and commit the change
  - [ ] (If exists) remove any lingering submodule sections from `.git/config`

- Re-enable GPG signing for this repository only
  - [ ] Ensure a valid secret key is present: `gpg --list-secret-keys --keyid-format=long`
  - [ ] Set local signing config for this repo only:
    - [ ] `git config --local gpg.format openpgp`
    - [ ] `git config --local user.signingkey <YOUR_KEY_ID>`
    - [ ] `git config --local gpg.program gpg`
    - [ ] `git config --local commit.gpgsign true`
  - [ ] (If using pinentry on macOS) Install and configure `pinentry-mac` if needed
  - [ ] Dry-run: `echo test | gpg --clearsign` to ensure passphrase prompts work

- Commit structure (grouping and messages)
  - [ ] Commit 1: feat(ts): add Polygon networks and USDC config
    - Scope: `network.ts`, `evm/config.ts`, `evm/wallet.ts`
    - Message:
      - Title: `feat(ts): add Polygon PoS (137) and Amoy (80002) network support`
      - Body: Includes USDC addresses, EIP-712 naming, and wallet chain mapping
  - [ ] Commit 2: feat(py): add Polygon networks and tokens
    - Scope: `networks.py`, `chains.py`
    - Message:
      - Title: `feat(py): add Polygon PoS and Amoy network/token mappings`
      - Body: IDs, known tokens (USDC), decimals, version
  - [ ] Commit 3: feat(go): extend gin middleware network/asset options + Polygon defaults
    - Scope: `go/pkg/gin/middleware.go`
    - Message:
      - Title: `feat(go/gin): add WithNetwork/WithAsset; default Polygon USDCs`
      - Body: preserves Base defaults; sets Polygon/Amoy USDC when selected
  - [ ] Commit 4: test(go): add Polygon network selection tests
    - Scope: `go/pkg/gin/middleware_test.go`
    - Message:
      - Title: `test(go/gin): add tests for polygon and polygon-amoy network selection`
  - [ ] Commit 5: test(ts): extend middleware asset tests for Polygon
    - Scope: `src/shared/middleware.test.ts`
    - Message:
      - Title: `test(ts): cover default asset for polygon and polygon-amoy`
  - [ ] Commit 6: chore(site): list polygon networks in supported endpoint
    - Scope: `typescript/site/app/facilitator/supported/route.ts`
    - Message:
      - Title: `chore(site): include polygon and polygon-amoy in supported`
  - [ ] Commit 7: docs(demo): add implementation plan
    - Scope: `demo/polygon_extension_implementation.md`
    - Message:
      - Title: `docs(demo): add polygon extension plan and checklist`
  - [ ] Commit 8: chore: remove temporary scripts and focused test
    - Scope: `scripts/*.ts` under TS package, `python/x402/tests/test_chains_polygon.py`
    - Message:
      - Title: `chore: remove local validation scripts and focused polygon test`
  - [ ] Commit 9: chore(git): remove unintended A2A submodule
    - Scope: `.gitmodules`, submodule removal
    - Message:
      - Title: `chore(git): remove unintended A2A submodule`

- Final verification before pushing PR
  - [ ] TypeScript: `pnpm -C typescript/packages/x402 test`
  - [ ] Go: `go test ./go/...`
  - [ ] Python (focused sanity): `cd python/x402 && PYTHONPATH=src pytest -q tests` (or run the full suite if the environment has deps)
  - [ ] Build checks (if required by CI prior to PR)

- PR content
  - [ ] Title: `Add Polygon PoS (137) and Polygon Amoy (80002) support across TypeScript, Python, and Go`
  - [ ] Description includes:
    - What changed (files and mappings)
    - USDC addresses and EIP-712 naming
    - Test outcomes (TS, Go, Python focused)
    - Local verification result on Amoy
    - Note that public facilitator currently rejects polygon-amoy with `invalid_payload` (likely unsupported), but library verification passes

- Post-PR follow-ups (optional)
  - [ ] Gate polygon networks in site listing if upstream facilitator doesn’t list them yet
  - [ ] Add settlement e2e harness and capture a Polygon Amoy tx hash in docs once an appropriate facilitator supports it 