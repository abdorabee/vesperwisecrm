# Dialer cost estimate (BYO Twilio, US + Egypt)

Ops estimate for Twilio Voice spend when running this CRM’s browser→PSTN dialer pattern. Rates are pay-as-you-go list prices as of the estimate date; **verify on Twilio’s pricing pages before quoting customers**.

- [US Voice pricing](https://www.twilio.com/en-us/voice/pricing/us)
- [Egypt Voice pricing](https://www.twilio.com/en-us/voice/pricing/eg)

## Fit: does the current dialer support BYO Twilio?

**No.** The V1 dialer on this branch is a **platform-owned, single-account** Twilio deployment:

- Global credentials: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, API key, TwiML App SID
- Single caller ID: `TWILIO_VOICE_FROM_NUMBER` (see `src/lib/dialer/providers/twilio/server.ts`)
- No per-tenant credential store, no UI for tenants to add their own Twilio number or account, no usage metering or billing

Under a **BYO Twilio** model (tenant brings their own Twilio account and numbers), each tenant would pay Twilio directly. Platform Twilio voice spend would be ~$0 after that model is implemented. **Until then, the current branch puts all voice minutes on the platform’s shared Twilio bill.**

This document estimates **tenant (or platform, today) Twilio spend** for the same call architecture. It does not implement BYO, in-app metering, or tenant billing.

## How billing works for this dialer

Each answered outbound call has two Twilio legs:

1. **Browser/app (Voice SDK Client)** — agent WebRTC
2. **PSTN outbound** — dialed contact number

Twilio bills by **destination country of the dialed number**, not where the agent sits. An agent in Cairo dialing a US lead pays US rates; dialing an Egyptian mobile pays Egypt rates (~12×).

```text
Agent browser  --Client $0.004/min-->  Twilio  --PSTN (by destination)-->  Contact
                                              └─ US  ~$0.014/min
                                              └─ EG mobile ~$0.209/min
```

V1 does not use recording, AMD, or transcription (see [DIALER.md](./DIALER.md)); those are excluded from the estimate.

## Unit rates

| Component | Rate | Notes |
|-----------|------|-------|
| Browser/app (Voice SDK) | $0.0040 / min | Same regardless of agent country |
| Outbound US/Canada PSTN | $0.0140 / min | US/Canada leads |
| Outbound Egypt local/Cairo | $0.2056 / min | EG landline |
| Outbound Egypt mobile | $0.2090 / min | Typical EG CRM dials |
| Phone number rental | ~$1.15 / mo | Starting; locale-dependent |

### Connected talk-time (browser + PSTN)

| Destination | Formula | Unit cost |
|-------------|---------|-----------|
| US/Canada | $0.004 + $0.014 | **$0.018 / min** |
| Egypt local | $0.004 + $0.2056 | **$0.2096 / min** |
| Egypt mobile | $0.004 + $0.2090 | **$0.2130 / min** |

**Per 3-minute answered call:** US ≈ **$0.054** · Egypt mobile ≈ **$0.64**

Use **answered talk minutes** as the primary forecast driver. Add ~10–20% buffer for ring/setup/failed attempts if volume is high.

## Monthly formula

```text
Voice ≈ Σ (connected_min_dest × rate_dest)
Total ≈ Voice + ($1.15 × numbers)
```

## Egypt operational caveats

- Twilio **does not currently sell voice-enabled local numbers in Egypt**. Tenants typically use an international number (often US) as caller ID when dialing EG contacts — recipients may see a foreign number, which can hurt answer rates.
- Agent location in Egypt does not change PSTN destination rates. Rare TURN relay usage (~$0.40–0.60/GB) is usually negligible vs minutes.
- App default for national-format parsing is `DIALER_DEFAULT_COUNTRY=US` (`src/lib/dialer/config.ts`). EG workspaces should prefer E.164 contact numbers (or an EG default) so local formats parse correctly. This is a product caveat, not a pricing line item.

## Scenario tables

Assumptions: 22 workdays/month, 1 number at $1.15/mo unless noted.

### A — Dialing US contacts

Any agent location (including Egypt-based agents). Rate **$0.018/min**.

| Profile | Agents | Talk min/agent/day | Min/mo | Voice $ | Est. total |
|---------|--------|--------------------|--------|---------|------------|
| Solo | 1 | 60 | 1,320 | ~$24 | **~$25** |
| Small team | 3 | 90 | 5,940 | ~$107 | **~$108** |
| Busy floor | 10 | 120 | 26,400 | ~$475 | **~$476** |

### B — Dialing Egypt mobiles

Rate **$0.213/min**.

| Profile | Agents | Talk min/agent/day | Min/mo | Voice $ | Est. total |
|---------|--------|--------------------|--------|---------|------------|
| Solo | 1 | 60 | 1,320 | ~$281 | **~$282** |
| Small team | 3 | 90 | 5,940 | ~$1,265 | **~$1,266** |
| Busy floor | 10 | 120 | 26,400 | ~$5,623 | **~$5,624** |

### C — Mixed book (illustrative): 70% US / 30% EG mobile

Blended rate ≈ `0.7 × 0.018 + 0.3 × 0.213 = $0.0765/min`.

| Profile | Min/mo | Est. voice $ | Est. total |
|---------|--------|--------------|------------|
| Solo | 1,320 | ~$101 | **~$102** |
| Small team | 5,940 | ~$455 | **~$456** |
| Busy floor | 26,400 | ~$2,020 | **~$2,021** |

## Who pays today vs under BYO

| Model | Who pays Twilio voice |
|-------|------------------------|
| **Current dialer branch** | Platform (shared account + `TWILIO_VOICE_FROM_NUMBER`) |
| **BYO Twilio (not implemented)** | Each tenant on their own Twilio account |

Platform always pays CRM hosting (Vercel, Supabase, etc.) separately.

## Non-goals

- No in-app minute metering or cost UI
- No tenant billing / credits / markup
- No BYO Twilio credential or number provisioning implementation

BYO would be a separate project: encrypted per-tenant credentials, per-tenant TwiML App / webhook routing, caller-ID selection, and credential rotation.
