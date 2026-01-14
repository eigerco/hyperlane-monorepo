# Hyperlane-Cardano Epics & Tasks

This directory contains detailed specifications for completing the Hyperlane-Cardano integration, organized as **Epics** (major work streams) and **Tasks** (individual work items).

## Structure

```
tasks/
├── README.md                     # This file - Overview and tracking
├── epic-1-bidirectional-messaging/
│   ├── EPIC.md                   # Epic overview
│   ├── task-1.1-merkletree-hook.md
│   ├── task-1.2-validator-agent.md
│   ├── task-1.3-checkpoint-syncer.md
│   ├── task-1.4-validator-config.md
│   ├── task-1.5-dispatch-cli.md
│   ├── task-1.6-validator-announce.md
│   └── task-1.7-e2e-testing.md
├── epic-2-token-bridge/
│   ├── EPIC.md
│   ├── task-2.1-fix-minted-amount.md
│   ├── task-2.2-collateral-route.md
│   ├── task-2.3-synthetic-route.md
│   ├── task-2.4-remote-enrollment.md
│   └── task-2.5-transfer-testing.md
├── epic-3-gas-payments/
│   ├── EPIC.md
│   ├── task-3.1-rpc-endpoint.md
│   ├── task-3.2-cli-commands.md
│   ├── task-3.3-relayer-integration.md
│   ├── task-3.4-e2e-testing.md
│   ├── task-3.5-post-dispatch-hook.md
│   └── task-3.6-contract-enhancements.md
├── epic-4-advanced-features/
│   ├── EPIC.md
│   ├── task-4.1-per-recipient-ism.md
│   ├── task-4.2-nft-lookups.md
│   ├── task-4.3-ref-script-cache.md
│   └── task-4.4-parallel-queries.md
├── epic-5-production-readiness/
│   ├── EPIC.md
│   ├── task-5.1-reorg-detection.md
│   ├── task-5.2-prometheus-metrics.md
│   ├── task-5.3-grafana-dashboards.md
│   ├── task-5.4-alerting.md
│   └── task-5.5-health-checks.md
└── epic-6-security-audit/
    ├── EPIC.md
    ├── task-6.1-contract-audit.md
    ├── task-6.2-crypto-review.md
    └── task-6.3-offchain-review.md
```

## Epic Overview

<details>
<summary><strong>Epic 1: Bidirectional Messaging</strong> | 🔴 Critical | ⬜ Not Started | 7 tasks</summary>

Enable Cardano → Remote chain messaging

| # | Task | Status | Description |
|---|------|--------|-------------|
| 1.1 | [MerkleTree Hook](./epic-1-bidirectional-messaging/task-1.1-merkletree-hook.md) | ⬜ | Implement merkle tree state retrieval |
| 1.2 | [Validator Agent](./epic-1-bidirectional-messaging/task-1.2-validator-agent.md) | ⬜ | Add Cardano support to validator |
| 1.3 | [Checkpoint Syncer](./epic-1-bidirectional-messaging/task-1.3-checkpoint-syncer.md) | ⬜ | Sync checkpoints from Cardano |
| 1.4 | [Validator Config](./epic-1-bidirectional-messaging/task-1.4-validator-config.md) | ⬜ | Configuration and CLI commands |
| 1.5 | [Dispatch CLI](./epic-1-bidirectional-messaging/task-1.5-dispatch-cli.md) | ⬜ | CLI command to dispatch messages |
| 1.6 | [Validator Announce](./epic-1-bidirectional-messaging/task-1.6-validator-announce.md) | ⬜ | Register validators on-chain |
| 1.7 | [E2E Testing](./epic-1-bidirectional-messaging/task-1.7-e2e-testing.md) | ⬜ | End-to-end and bidirectional tests |

[View Epic Details](./epic-1-bidirectional-messaging/EPIC.md)
</details>

<details>
<summary><strong>Epic 2: Token Bridge</strong> | 🟡 High | ⬜ Not Started | 5 tasks</summary>

Warp routes for cross-chain tokens

| # | Task | Status | Description |
|---|------|--------|-------------|
| 2.1 | [Fix Minted Amount](./epic-2-token-bridge/task-2.1-fix-minted-amount.md) | ✅ | Fix placeholder in warp_route.ak |
| 2.2 | [Collateral Route](./epic-2-token-bridge/task-2.2-collateral-route.md) | ⬜ | Deploy collateral warp route |
| 2.3 | [Synthetic Route](./epic-2-token-bridge/task-2.3-synthetic-route.md) | ⬜ | Deploy synthetic warp route |
| 2.4 | [Remote Enrollment](./epic-2-token-bridge/task-2.4-remote-enrollment.md) | ⬜ | Enroll remote routers |
| 2.5 | [Transfer Testing](./epic-2-token-bridge/task-2.5-transfer-testing.md) | ⬜ | E2E transfer tests |

[View Epic Details](./epic-2-token-bridge/EPIC.md)
</details>

<details>
<summary><strong>Epic 3: Gas Payments</strong> | 🟡 High | ⬜ Not Started | 6 tasks</summary>

IGP for gas payment handling

| # | Task | Status | Description |
|---|------|--------|-------------|
| 3.1 | [RPC Endpoint](./epic-3-gas-payments/task-3.1-rpc-endpoint.md) | ⬜ | Implement gas payment indexing |
| 3.2 | [CLI Commands](./epic-3-gas-payments/task-3.2-cli-commands.md) | ⬜ | pay-for-gas, quote, claim, set-oracle |
| 3.3 | [Relayer Integration](./epic-3-gas-payments/task-3.3-relayer-integration.md) | ⬜ | Relayer queries gas payments |
| 3.4 | [E2E Testing](./epic-3-gas-payments/task-3.4-e2e-testing.md) | ⬜ | Test full payment flow |
| 3.5 | [Post-Dispatch Hook](./epic-3-gas-payments/task-3.5-post-dispatch-hook.md) | ⬜ | Automatic gas payment at dispatch |
| 3.6 | [Contract Enhancements](./epic-3-gas-payments/task-3.6-contract-enhancements.md) | ⬜ | Refund handling, defaults |

[View Epic Details](./epic-3-gas-payments/EPIC.md)
</details>

<details>
<summary><strong>Epic 4: Advanced Features</strong> | 🟢 Medium | ⬜ Not Started | 4 tasks</summary>

Per-recipient ISM, performance optimizations

| # | Task | Status | Description |
|---|------|--------|-------------|
| 4.1 | [Per-Recipient ISM](./epic-4-advanced-features/task-4.1-per-recipient-ism.md) | ⬜ | Custom ISM per recipient |
| 4.2 | [NFT Lookups](./epic-4-advanced-features/task-4.2-nft-lookups.md) | ⬜ | O(1) recipient lookups via NFT |
| 4.3 | [Ref Script Cache](./epic-4-advanced-features/task-4.3-ref-script-cache.md) | ⬜ | Cache reference script UTXOs |
| 4.4 | [Parallel Queries](./epic-4-advanced-features/task-4.4-parallel-queries.md) | ⬜ | Parallelize Blockfrost calls |

[View Epic Details](./epic-4-advanced-features/EPIC.md)
</details>

<details>
<summary><strong>Epic 5: Production Readiness</strong> | 🟢 Medium | ⬜ Not Started | 5 tasks</summary>

Monitoring, alerting, operations

| # | Task | Status | Description |
|---|------|--------|-------------|
| 5.1 | [Reorg Detection](./epic-5-production-readiness/task-5.1-reorg-detection.md) | ⬜ | Detect chain reorganizations |
| 5.2 | [Prometheus Metrics](./epic-5-production-readiness/task-5.2-prometheus-metrics.md) | ⬜ | Export operational metrics |
| 5.3 | [Grafana Dashboards](./epic-5-production-readiness/task-5.3-grafana-dashboards.md) | ⬜ | Visual dashboards |
| 5.4 | [Alerting](./epic-5-production-readiness/task-5.4-alerting.md) | ⬜ | Alert rules for incidents |
| 5.5 | [Health Checks](./epic-5-production-readiness/task-5.5-health-checks.md) | ⬜ | Health endpoint for k8s probes |

[View Epic Details](./epic-5-production-readiness/EPIC.md)
</details>

<details>
<summary><strong>Epic 6: Security Audit</strong> | 🔴 Critical | ⬜ Not Started | 3 tasks</summary>

Final audit before mainnet

| # | Task | Status | Description |
|---|------|--------|-------------|
| 6.1 | [Contract Audit](./epic-6-security-audit/task-6.1-contract-audit.md) | ⬜ | Aiken smart contract audit |
| 6.2 | [Crypto Review](./epic-6-security-audit/task-6.2-crypto-review.md) | ⬜ | Cryptographic implementation review |
| 6.3 | [Off-chain Review](./epic-6-security-audit/task-6.3-offchain-review.md) | ⬜ | Rust off-chain code review |

[View Epic Details](./epic-6-security-audit/EPIC.md)
</details>

## Development Phases

```
+---------------------------------------------------------------------+
|                    PHASE 1: CORE FUNCTIONALITY                      |
+---------------------------------------------------------------------+
|                                                                     |
|  Epic 1: Bidirectional Messaging (BLOCKING)                         |
|  +-------------+    +-------------+    +-------------+              |
|  | Task 1.1    |--->| Task 1.2    |--->| Task 1.3    |              |
|  | MerkleTree  |    | Validator   |    | Checkpoint  |              |
|  | Hook        |    | Agent       |    | Syncer      |              |
|  +-------------+    +-------------+    +-------------+              |
|         |                                     |                     |
|         v                                     v                     |
|  +-------------+                      +-------------+               |
|  | Task 1.5    |                      | Task 1.4    |               |
|  | Dispatch    |                      | Validator   |               |
|  | CLI         |                      | Config      |               |
|  +-------------+                      +-------------+               |
|         |                                     |                     |
|         |                                     v                     |
|         |                             +-------------+               |
|         |                             | Task 1.6    |               |
|         |                             | Validator   |               |
|         |                             | Announce    |               |
|         |                             +-------------+               |
|         |                                     |                     |
|         +------------------+------------------+                     |
|                            v                                        |
|                     +-------------+                                 |
|                     | Task 1.7    |                                 |
|                     | E2E Testing |                                 |
|                     +-------------+                                 |
|                            |                                        |
|                            v                                        |
|               BIDIRECTIONAL MESSAGING COMPLETE                      |
|                                                                     |
+---------------------------------------------------------------------+

+---------------------------------------------------------------------+
|               PHASE 2: FEATURE COMPLETION (Parallel)                |
+---------------------------------------------------------------------+
|                                                                     |
|  Epic 2: Token Bridge          Epic 3: Gas Payments                 |
|  +-------------+               +-------------+                      |
|  | Task 2.1    |               | Task 3.1    |                      |
|  | Fix Minted  |               | RPC         |                      |
|  | Amount      |               | Endpoint    |                      |
|  +-------------+               +-------------+                      |
|        |                             |                              |
|        v                             v                              |
|  +-------------+               +-------------+                      |
|  | Task 2.2-2.4|               | Task 3.2-3.3|                      |
|  | Deploy &    |               | CLI &       |                      |
|  | Enroll      |               | Relayer     |                      |
|  +-------------+               +-------------+                      |
|        |                             |                              |
|        v                             v                              |
|  +-------------+               +-------------+                      |
|  | Task 2.5    |               | Task 3.4    |                      |
|  | Transfer    |               | E2E         |                      |
|  | Testing     |               | Testing     |                      |
|  +-------------+               +-------------+                      |
|                                                                     |
|  Epic 4: Advanced Features                                          |
|  +---------------------------------------------+                    |
|  | Task 4.1-4.4: ISM, NFT Lookups, Caching     |                    |
|  +---------------------------------------------+                    |
|                                                                     |
+---------------------------------------------------------------------+

+---------------------------------------------------------------------+
|               PHASE 3: PRODUCTION HARDENING                         |
+---------------------------------------------------------------------+
|                                                                     |
|  Epic 5: Production Readiness                                       |
|  +-------------+    +-------------+    +-------------+              |
|  | Task 5.1    |    | Task 5.2    |    | Task 5.3    |              |
|  | Reorg       |    | Prometheus  |    | Grafana     |              |
|  | Detection   |    | Metrics     |    | Dashboards  |              |
|  +-------------+    +-------------+    +-------------+              |
|                                                                     |
|  +-------------+    +-------------+                                 |
|  | Task 5.4    |    | Task 5.5    |                                 |
|  | Alerting    |    | Health      |                                 |
|  | Rules       |    | Checks      |                                 |
|  +-------------+    +-------------+                                 |
|                                                                     |
+---------------------------------------------------------------------+

+---------------------------------------------------------------------+
|               PHASE 4: SECURITY GATE (Before Mainnet)               |
+---------------------------------------------------------------------+
|                                                                     |
|  Epic 6: Security Audit (FINAL GATE)                                |
|  +-------------+    +-------------+    +-------------+              |
|  | Task 6.1    |    | Task 6.2    |    | Task 6.3    |              |
|  | Contract    |    | Crypto      |    | Off-chain   |              |
|  | Audit       |    | Review      |    | Review      |              |
|  +-------------+    +-------------+    +-------------+              |
|                            |                                        |
|                            v                                        |
|                      MAINNET READY                                  |
|                                                                     |
+---------------------------------------------------------------------+
```

## Task Status Legend

| Status | Icon | Description |
|--------|------|-------------|
| Not Started | ⬜ | Work has not begun |
| In Progress | 🟡 | Actively being worked on |
| Blocked | 🔴 | Waiting on dependency |
| Complete | ✅ | Done and verified |

## Quick Reference

### What's Working Now
- ✅ Incoming messages (Fuji → Cardano)
- ✅ ISM signature verification
- ✅ Recipient invocation
- ✅ CLI deployment commands

### What's Missing (Priority Order)
1. **Outgoing messages** (Epic 1) - Cardano → Remote chains
2. **Token transfers** (Epic 2) - Warp routes
3. **Gas payments** (Epic 3) - IGP integration
4. **Advanced features** (Epic 4) - Per-recipient ISM, performance
5. **Production ops** (Epic 5) - Monitoring, alerting
6. **Security audit** (Epic 6) - Final gate before mainnet

## Related Documentation

- [DESIGN.md](../DESIGN.md) - Architecture overview
- [INTEGRATION_STATUS.md](../INTEGRATION_STATUS.md) - Current status
- [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) - Deployment instructions
- [FUTURE_OPTIMIZATIONS.md](../FUTURE_OPTIMIZATIONS.md) - Future improvements and features
