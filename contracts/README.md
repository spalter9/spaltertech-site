# Sovereign Sign Registry

The on-chain half of the Sovereign Sign Protocol: one registry contract per
chain that binds a master recording's hash to an immutable royalty split, then
settles payments against it.

Ported from the `surreal-stamp-engine` Lovable project, which is where it was
originally written and where its front end lives.

## What it does

| Function | Who calls it | Effect |
|---|---|---|
| `stamp(trackHash, recipients, sharesBps)` | rights holder, once per track | Binds a 32-byte content hash to a recipient list. First caller wins; the split can never be changed afterwards. |
| `pay(trackHash, amount)` | anyone paying royalties | Pulls ERC-20 from the caller and credits each recipient's balance by share. |
| `withdraw()` | a recipient | Sweeps their own accrued balance. |
| `getSplit` / `isStamped` / `stampedAt` | anyone | Read the registry. |

`trackHash` is deliberately just "any 32 bytes", which is what lets it line up
with the rest of this repo: the Sovereign Audio Protocol already computes a
SHA-256 over the bit-exact PCM payload of every sealed master
(`payload_sha256` in the manifest — see
[`docs/sovereign-audio-protocol.md`](../docs/sovereign-audio-protocol.md)).
That hash is the natural key to stamp, because it survives metadata rewrites
and identifies the audio rather than the file.

## Design notes worth keeping in mind

**Pull payments, not push.** `pay()` credits balances; recipients withdraw
themselves. A push-payment loop would let one reverting recipient block payout
for everyone else in the split, and would expose the whole loop to re-entrancy.

**Dust goes to the last recipient.** Integer division on basis points leaves a
remainder; rather than lose it, the final recipient receives
`amount - distributed`. Over many payments this is a rounding-level advantage
to whoever is listed last — order the recipient array deliberately.

**Splits are immutable.** There is no `updateSplit`. A corrected split needs a
new `trackHash`, which in practice means re-stamping a re-rendered master. This
is the right default for a provenance registry, but it does mean a typo in the
recipient list is permanent — validate before stamping.

**Fee-on-transfer tokens are not supported.** `pay()` credits the full `amount`
it was asked to pull, so a token that deducts a transfer fee would leave the
contract crediting more than it actually received. `token` is immutable and set
at construction, so this is a deployment-time decision: use a standard ERC-20.
USDC on Polygon (`0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359`) is the intended
settlement asset and does not take a fee.

**No admin, no upgrade path, no pause.** There is no owner and no proxy. Once
deployed it behaves exactly as written, forever — which is the point of a
registry, and also means it must be right before it ships.

## Before deploying

This contract has not been audited. It is short and follows the standard safe
patterns (checks-effects-interactions in `withdraw`, a re-entrancy guard on
both state-changing external calls, no delegatecall, no assembly), but "reads
correct" and "is audited" are different claims and only one of them is true
here. Get a review before it holds real money.

```bash
# Compile (Foundry)
forge build

# Deploy to Polygon with USDC as the settlement token
forge create contracts/SovereignSignRegistry.sol:SovereignSignRegistry \
  --rpc-url "$POLYGON_RPC_URL" \
  --private-key "$DEPLOYER_KEY" \
  --constructor-args 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
```

There is no Foundry/Hardhat config committed here — this repo is a Bun/Vite
monorepo and does not build Solidity as part of `bun run build`. The contract
lives here so it versions alongside the protocol that produces the hashes it
stamps.
