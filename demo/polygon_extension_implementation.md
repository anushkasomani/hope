## Goal
Extend x402 support to Polygon PoS mainnet and Polygon Amoy testnet using the existing facilitator infrastructure, with full unit tests and a validation plan suitable for a PR to the official x402 repo.

---

### Current state: supported networks in this repo
- TypeScript (`typescript/packages/x402/src/types/shared/network.ts`)
  - Networks enum: `base-sepolia`, `base`, `avalanche-fuji`, `avalanche`, `iotex`, `sei`, `sei-testnet`
  - `EvmNetworkToChainId`: 84532, 8453, 43113, 43114, 4689, 1329, 1328
  - USDC config by ChainId (`types/shared/evm/config.ts`): includes Base, Avalanche, IoTeX, Sei
  - Wallet chains (`types/shared/evm/wallet.ts`): imports `base`, `baseSepolia`, `avalancheFuji`, `sei`, `seiTestnet`; maps network strings to these chains
  - Default-asset resolver (`shared/middleware.ts`): uses `getNetworkId` + EVM config to pick USDC address/name
- Python
  - `x402/networks.py`: SupportedNetworks literal contains `base`, `base-sepolia`, `avalanche-fuji`, `avalanche`; maps to chain IDs
  - `x402/chains.py`: `NETWORK_TO_ID` for Base/Avalanche and `KNOWN_TOKENS` entries for USDC on those chain IDs
- Go
  - Middleware (`go/pkg/gin/middleware.go`): hardcoded network + USDC address for Base; toggles to Base Sepolia when `Testnet` is true
  - `SetUSDCInfo` (`go/pkg/types/types.go`): fills EIP-712 `name`/`version` into `PaymentRequirements.Extra` depending on testnet vs mainnet
- Site (docs)
  - `typescript/site/app/facilitator/supported/route.ts`: serves `kinds` with only `scheme: exact`, `network: base-sepolia`

---

### Target networks and USDC addresses
- Polygon PoS mainnet (`polygon`):
  - Chain ID: 137
  - USDC contract: `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`
  - EIP-712 name: "USD Coin" (mainnet convention)
  - Decimals: 6
  - Version: "2"
- Polygon Amoy testnet (`polygon-amoy`):
  - Chain ID: 80002
  - USDC contract: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
  - EIP-712 name: "USDC" (testnet convention used elsewhere in repo)
  - Decimals: 6
  - Version: "2"

---

### High-level plan
1. TypeScript core updates (x402 package)
   - Add `polygon` and `polygon-amoy` to `NetworkSchema`, `SupportedEVMNetworks`, and `EvmNetworkToChainId`
   - Add chain ID entries to `types/shared/evm/config.ts` with the USDC addresses and names
   - Extend `types/shared/evm/wallet.ts` to map `polygon` and `polygon-amoy` to `viem/chains` (use `polygon` and `polygonAmoy`)
   - No changes needed to `shared/middleware.ts` beyond config; `getDefaultAsset` will pick up the new chains automatically
2. Python updates (library parity)
   - Add `polygon` and `polygon-amoy` to `x402/networks.py` (`SupportedNetworks`, `EVM_NETWORK_TO_CHAIN_ID`)
   - Add to `x402/chains.py`: `NETWORK_TO_ID` plus `KNOWN_TOKENS` entries with the USDC addresses (name/decimals/version)
3. Go middleware ergonomics
   - Introduce options to override network and asset instead of Base-only:
     - `WithNetwork(network string)` (e.g., `polygon` or `polygon-amoy`)
     - `WithAsset(address string)` for custom ERC-20 address, when needed
   - Backward compatible behavior: if neither provided, retain Base(+Sepolia when `Testnet`)
   - When `WithNetwork("polygon")` is provided and `WithAsset` not set, default `usdcAddress` to the known USDC for that chain
   - Continue using `SetUSDCInfo(isTestnet)` to fill EIP-712 name/version
4. Site/support listing
   - Update `typescript/site/app/facilitator/supported/route.ts` to list the newly supported networks (at minimum add `polygon-amoy`; optionally include `polygon`)
5. Tests and validation
   - TS unit tests: network mapping, default asset config for Polygon, typed data domain, and verify path happy-path (mocked)
   - Python tests: chain id resolution and token lookup for Polygon; ensure functions return expected values
   - Go tests: middleware network selection with `WithNetwork("polygon-amoy")` and `WithNetwork("polygon")`, verifying `accepts[0].network` and `asset`
   - E2E/manual: local run against Amoy using funded account; confirm signature verification and settlement response

---

### Detailed task list with file-level edits

#### TypeScript (package: `typescript/packages/x402`)
- Edit `src/types/shared/network.ts`
  - Add to enum and arrays:
    - Add `"polygon"`, `"polygon-amoy"` to `NetworkSchema` and `SupportedEVMNetworks`
  - Update map:
    - `EvmNetworkToChainId.set("polygon", 137)`
    - `EvmNetworkToChainId.set("polygon-amoy", 80002)`
- Edit `src/types/shared/evm/config.ts`
  - Add entries:
    - `"137": { usdcAddress: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", usdcName: "USD Coin" }`
    - `"80002": { usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", usdcName: "USDC" }`
- Edit `src/types/shared/evm/wallet.ts`
  - Import new chains: `import { polygon, polygonAmoy } from "viem/chains"`
  - Extend `getChainFromNetwork` switch:
    - `case "polygon": return polygon;`
    - `case "polygon-amoy": return polygonAmoy;`
  - Note: if `polygonAmoy` is not present in the current viem version, define a custom chain object with id 80002
- Optional examples update
  - `examples/typescript/mcp-embedded-wallet/src/utils/chainConfig.ts`: add `polygon`/`polygon-amoy` similarly (for example app parity)

#### Python (package: `python/x402`)
- Edit `src/x402/networks.py`
  - Extend `SupportedNetworks` literal with `"polygon"`, `"polygon-amoy"`
  - Add to `EVM_NETWORK_TO_CHAIN_ID`:
    - `"polygon": 137`, `"polygon-amoy": 80002`
- Edit `src/x402/chains.py`
  - Add to `NETWORK_TO_ID`:
    - `"polygon": "137"`, `"polygon-amoy": "80002"`
  - Extend `KNOWN_TOKENS` with entries for `"137"` and `"80002"` using addresses above
    - Name: mainnet `"USD Coin"`, amoy `"USDC"`; `decimals: 6`, `version: "2"`

#### Go (package: `go/pkg/gin` + `go/pkg/types`)
- Edit `go/pkg/gin/middleware.go`
  - Add option type and helper:
    - `func WithNetwork(network string) Options`
    - `func WithAsset(asset string) Options`
  - Extend `PaymentMiddlewareOptions` with fields `Network string` and `Asset string`
  - Selection logic inside handler:
    - Prefer explicit `options.Network` and `options.Asset` when provided
    - Else fall back to current Base/Base-Sepolia logic
    - If `options.Network` is `polygon` and `options.Asset` empty, set `usdcAddress` to `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`
    - If `options.Network` is `polygon-amoy` and `options.Asset` empty, set `usdcAddress` to `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
  - Continue calling `paymentRequirements.SetUSDCInfo(options.Testnet)` to populate name/version
- (No change to facilitator client; it is network-agnostic)

#### Site support listing
- Edit `typescript/site/app/facilitator/supported/route.ts`
  - Add new entries under `kinds`:
    - `{ x402Version: 1, scheme: "exact", network: "polygon-amoy" }`
    - Optionally `{ x402Version: 1, scheme: "exact", network: "polygon" }`

---

### Unit tests and coverage

#### TypeScript
- New tests under `typescript/packages/x402/src/types/shared/__tests__/network.polygon.test.ts`:
  - `getNetworkId("polygon") === 137`, `getNetworkId("polygon-amoy") === 80002`
  - `ChainIdToNetwork[137] === "polygon"`, `ChainIdToNetwork[80002] === "polygon-amoy"`
- Tests for `shared/middleware.getDefaultAsset`:
  - For `polygon`, returns address `0x3c499c...`, decimals 6, eip712 name "USD Coin"
  - For `polygon-amoy`, returns address `0x41E94E...`, decimals 6, eip712 name "USDC"
- Tests for EIP-712 typed data domain composition:
  - The domain uses `chainId` 137 / 80002, `verifyingContract` equals the provided asset, `name` equals config or `extra.name` when provided
- Optionally mock `verify` path to assert `invalid_network` is not returned for polygon networks

#### Python
- New tests in `python/x402/tests/test_chains_polygon.py`:
  - `get_chain_id("polygon") == "137"`, `get_chain_id("polygon-amoy") == "80002"`
  - `get_default_token_address("137")` equals mainnet USDC address; same for `"80002"`
  - `get_token_name(...)` returns `"USD Coin"` for 137 and `"USDC"` for 80002
  - `get_token_version(...)` returns `"2"` for both

#### Go
- Extend `go/pkg/gin/middleware_test.go` with cases:
  - `WithNetwork("polygon-amoy")` → response `accepts[0].network == "polygon-amoy"`, `asset` equals `0x41E94E...`
  - `WithNetwork("polygon")` → response `accepts[0].network == "polygon"`, `asset` equals `0x3c499c...`
  - `WithNetwork("polygon")` + `WithAsset(custom)` → uses `custom`
  - Keep existing Base/Base-Sepolia behavior intact

---

### End-to-end / manual validation plan
- Prereqs
  - RPC endpoints for Polygon Amoy (`https://rpc-amoy.polygon.technology`) and Polygon PoS mainnet
  - A funded test account on Amoy; a small amount of POL for gas and USDC test tokens at `0x41E94E...`
  - For mainnet, use small-value test where possible (or simulate locally/mocked)
- Local run (TypeScript facilitator and example server)
  - Set `NETWORK=polygon-amoy` (or explicit in code) and run a sample flow that triggers an x402 payment
  - Confirm that the paywall returns `network: "polygon-amoy"` and `asset: 0x41E94E...`
  - Generate a payment header and send; facilitator verify should return `isValid: true`
  - Settle and capture `transaction` hash; verify on `https://amoy.polygonscan.com/`
- Local run (Go gin middleware)
  - Start a simple server with `PaymentMiddleware(..., WithNetwork("polygon-amoy"))`
  - Hit a protected endpoint without `X-PAYMENT` to inspect `accepts[]`
  - Send a mocked or real `X-PAYMENT` and exercise verify/settle against a local or remote facilitator

---

### Migration and compatibility notes
- Defaults remain unchanged (Base and Base Sepolia). Polygon is opt-in via network selection in app config
- `usdcName` for mainnet must be exactly `"USD Coin"` to match on-chain `name()` and EIP-712 domain
- `usdcName` for Amoy is `"USDC"` to align with existing testnet naming in repo
- If using an older `viem` without `polygonAmoy`, define a custom chain object with id `80002`

---

### PR checklist
- Code changes implemented across TS/Python/Go as above
- All unit tests added and passing locally:
  - TS: `pnpm -w -C typescript/packages/x402 test`
  - Python: `pytest python/x402`
  - Go: `go test ./go/...`
- Site `GET /facilitator/supported` includes Polygon networks where appropriate
- Documentation updated where examples mention networks (if any)
- E2E/manual notes captured with a sample transaction hash on Amoy

---

### Appendix: quick-reference constants
- Polygon PoS mainnet
  - Network key: `polygon`
  - Chain ID: `137`
  - USDC: `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`
  - EIP-712 name: `USD Coin`
- Polygon Amoy testnet
  - Network key: `polygon-amoy`
  - Chain ID: `80002`
  - USDC: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
  - EIP-712 name: `USDC` 

### Execution checklist (cross off as you complete)

- [x] TypeScript core: network definitions
  - [x] Add `"polygon"`, `"polygon-amoy"` to `typescript/packages/x402/src/types/shared/network.ts` (`NetworkSchema`, `SupportedEVMNetworks`)
  - [x] Add chain IDs to `EvmNetworkToChainId` (137, 80002)
  - [x] Ensure `ChainIdToNetwork` reflects new mappings
- [x] TypeScript core: USDC config
  - [x] Add `"137"` → USDC `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`, name `"USD Coin"`
  - [x] Add `"80002"` → USDC `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`, name `"USDC"`
  - [ ] Verify `getDefaultAsset("polygon")` and `getDefaultAsset("polygon-amoy")` return correct values
- [x] TypeScript core: wallet chains
  - [x] Import `polygon`, `polygonAmoy` from `viem/chains` or define custom chain for 80002
  - [x] Extend `getChainFromNetwork` in `types/shared/evm/wallet.ts` for `polygon` and `polygon-amoy`
- [x] TypeScript site support
  - [x] Update `typescript/site/app/facilitator/supported/route.ts` to include `polygon-amoy` (and optionally `polygon`)
- [x] TypeScript tests
  - [x] Add tests for `getNetworkId("polygon") === 137` and `getNetworkId("polygon-amoy") === 80002`
  - [x] Add tests for `ChainIdToNetwork[137] === "polygon"` and `[80002] === "polygon-amoy"`
  - [x] Add tests for `getDefaultAsset` to validate addresses, decimals, and EIP-712 name
  - [x] Add tests to validate EIP-712 domain composition (chainId, name, verifyingContract)
  - [x] Run TS tests: `pnpm -w -C typescript/packages/x402 test`

- [x] Python library: networks
  - [x] Extend `python/x402/src/x402/networks.py` SupportedNetworks with `"polygon"`, `"polygon-amoy"`
  - [x] Add to `EVM_NETWORK_TO_CHAIN_ID` map: 137, 80002
- [x] Python library: chains and tokens
  - [x] Add to `NETWORK_TO_ID`: `"polygon": "137"`, `"polygon-amoy": "80002"`
  - [x] Add `KNOWN_TOKENS` entries for 137 (USD Coin, decimals 6, version 2) and 80002 (USDC, decimals 6, version 2)
- [x] Python tests
  - [x] `get_chain_id("polygon") == "137"`, `get_chain_id("polygon-amoy") == "80002"`
  - [x] `get_default_token_address` and `get_token_name` return expected address and name for both
  - [x] `get_token_version` returns `"2"` for both (ran focused test file)
  - [x] Run Python tests: focused `tests/test_chains_polygon.py`

- [x] Go middleware: options
  - [x] Add `WithNetwork(network string)` to `go/pkg/gin/middleware.go`
  - [x] Add `WithAsset(asset string)` to override ERC-20 address when needed
  - [x] Extend `PaymentMiddlewareOptions` with fields `Network string` and `Asset string`
- [x] Go middleware: selection logic
  - [x] If `options.Network == "polygon"` and no `options.Asset`, default asset to `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`
  - [x] If `options.Network == "polygon-amoy"` and no `options.Asset`, default asset to `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
  - [x] Preserve Base/Base-Sepolia default behavior when no network specified
  - [x] Keep `paymentRequirements.SetUSDCInfo(options.Testnet)` call
- [x] Go tests
  - [x] Add test: `WithNetwork("polygon-amoy")` → `accepts[0].network == "polygon-amoy"`, correct asset
  - [x] Add test: `WithNetwork("polygon")` → `accepts[0].network == "polygon"`, correct asset
  - [x] Add test: `WithNetwork("polygon"), WithAsset(custom)` → asset equals custom
  - [x] Run Go tests: `go test ./go/...`

- [x] E2E/manual (Amoy)
  - [x] Ensure RPC endpoint configured for Amoy (e.g., `https://rpc-amoy.polygon.technology`)
  - [x] Fund test account with POL (gas) and USDC at `0x41E94E...`
  - [x] Run TS flow with `NETWORK=polygon-amoy`; generated X-PAYMENT header using provided wallet
  - [ ] Confirm tx on `https://amoy.polygonscan.com/`
- [ ] E2E/manual (Polygon mainnet) [optional]
  - [ ] Configure mainnet RPC and minimal-value test or mocked path
  - [ ] Validate `verify` path does not reject `polygon`

- [ ] Documentation and examples
  - [ ] Update any example configs mentioning networks to include Polygon where relevant
  - [ ] Add an example snippet showing `network: "polygon-amoy"` and correct `asset`
  - [ ] Include a sample Amoy transaction hash in README/notes

- [ ] PR readiness
  - [ ] All tests green (TS/Python/Go)
  - [ ] Site `GET /facilitator/supported` updated
  - [ ] CI passes (if applicable)
  - [ ] Submit PR with summary and validation notes 