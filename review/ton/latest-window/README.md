# Shared latest transaction window

Production observation showed one homepage issuing 7–10 distinct masterchain transaction requests in ten seconds. The shared entity provider reported a real HTTP 429 on the same route. Exact-route caching could not coalesce visitors observing different streaming heads.

`/api/ton/network-transactions?limit=50` now shares one successful 15-second window per provider/query, including one promise for simultaneous readers. At most eight query variants are retained. Failed refreshes retry after 1.5 seconds and may return the previous successful window as stale for at most 60 seconds, with its original observation timestamp and masterchain cursor. Initial failures remain errors. Explicit `master_seqno` and `before` requests preserve existing immutable historical behavior and pagination.

Frontend integration should request the cursor-free route on its existing initial/15-second/visibility cadence. Live block streaming remains independent.

Validation: four behavior tests pass covering 100 concurrent visitors plus advancing heads, expiry, stale recovery and timestamp preservation, initial failure, and exact historical pagination. Syntax checks pass.

```
NODE_PATH=/home/lukee/dev/ton-taxi/adapter/node_modules node --test review/ton/latest-window/behavior.test.cjs
```

No production or push actions performed by this agent.
