# Research: OpenList netdisk-to-object-storage feasibility

Ticket: `openlist-to-object-storage`
Date: 2026-08-15
Author: research subagent
Sources: WebFetch of github.com/OpenListTeam/OpenList, github.com/OpenListTeam/OpenList-Docs, github.com/AlistGo/alist issues, developers.cloudflare.com/r2, docs.oracle.com (FreeTier + S3 Compatibility API), rclone.org, heart repo CONTEXT.md (offline local source, quoted as [heart]).

Conventions: **[Fact]** = verified from a primary source below; **[Inference]** = reasoning not directly documented. Every claim is tagged.

---

## TL;DR (conclusion table)

| Question | Answer | Confidence |
|---|---|---|
| What is OpenList? | Community fork of AList ("A new AList Fork to Anti Trust Crisis", 24.1k stars), file-list + multi-storage gateway, Go/Gin + SolidJS, AGPL-3.0, now v4.x | [Fact] |
| Can it expose a netdisk as an S3-compatible object store? | No. Client-facing protocols are WebDAV + HTTP (own API). S3 appears only as an *input* driver, never as an *output* endpoint. No S3-gateway feature, no R2 output. | [Fact] |
| Can it be a read/write data backend for the song wall? | Technically yes via WebDAV/HTTP API (upload/mkdir/rename/delete are core features), but it requires a long-running VPS/box, a netdisk login, and it is a 302-direct-link engine, not a data store. | [Fact]/[Inference] |
| "VPS + OpenList converts netdisk to object storage" - feasible? | Possible only in a synthetic sense (rclone `serve s3` over OpenList WebDAV, experimental); full of pitfalls: netdisk API instability, login/session expiry, rate limits, scan-time auth, non-S3 semantics, ToS risk. | [Fact]/[Inference] |
| Which backend fits the song wall best? | **Cloudflare R2** as primary (S3-compatible, free, globally free egress, public buckets + custom domain), **Oracle OSS** as Oracle is a documented/backed-up choice (PAYG account exists, S3 compat, free tier). R2's free request quota is 20x Oracle's (1M Class A vs 50k), and the site already runs on the CF stack (Pages/Workers). | [Fact]/[Inference] |
| Final recommendation | Song wall data (small JSON + images) goes into **R2 public bucket** (or Oracle OSS bucket) written via S3 API by the static-site build / admin script; OpenList+netdisk is dropped for this use case (keep it only for heart's 302 large-file chain). | [Fact]/[Inference] |

---

## Q1. What is OpenList / Alist, and can it expose a netdisk as object storage?

### What it is

- **Alist** (`AlistGo/alist`): "A file list program that supports multiple storages, powered by Gin and Solidjs." File listing / WebDAV gateway over many storage backends. [Fact]
- **OpenList** (`OpenListTeam/OpenList`): fork of AList, tagline "A new AList Fork to Anti Trust Crisis", ~24.1k stars, current release v4.2.4 (docs build 2026-07-31), license AGPL-3.0. Community-driven successor; used in the same role heart documented. [Fact]
- Core capabilities (both projects): file preview (PDF/markdown/code/images/video/audio/Office), README preview, dark mode, i18n, password-protected routes, WebDAV access, web upload/delete/mkdir/rename/move/copy, offline download, copy between storages, multi-thread download acceleration, Docker deploy, Cloudflare Workers proxy. [Fact]

### Storage backend (driver) list (OpenList README)

Aliyundrive, OneDrive/SharePoint, 189cloud, GoogleDrive, 123pan, FTP/SFTP, PikPak, S3, Seafile, UPYUN, WebDAV, Teambition, MediaFire, Mediatrack, ProtonDrive, **139yun (China Mobile Cloud)**, YandexDisk, BaiduNetdisk, Terabox, UC, Quark, Thunder, Lanzou, ILanzou, Google Photos, Mega.nz, Baidu Photo, SMB, 115, Cloudreve, Dropbox, FeijiPan, dogecloud, Azure Blob Storage, Chaoxing, CNB, Degoo, Doubao, Febbox, GitHub, OpenList, Teldrive, Weiyun, DingTalk Docs. [Fact]

Note: "S3" appears only in this input-driver list (you can mount an S3/R2 bucket *into* OpenList). It is never an output protocol. [Fact]

### Can it expose a netdisk as object storage?

**No native S3 output.** [Fact]

- Client-facing protocols documented: **WebDAV** + the **HTTP API** (own REST-ish API; OpenList docs point to `fox.oplist.org` for the interactive API reference). [Fact]
- No "S3 gateway / S3 protocol / serve as object storage" feature exists in either project's README, docs, or issues. Search of Alist issues for "s3 protocol" only surfaces using R2/S3 *as a mounted backend* (e.g. issue #7703 "mount cloudflare r2 with s3 protocol", open; upload works, download broken). [Fact]
- Direct links are plain HTTP 302 (that is what heart's 302 large-file chain relied on). [heart][Fact]

**Conclusion:** OpenList cannot turn a netdisk into an S3-compatible endpoint by itself. It *can* turn a netdisk into a **WebDAV endpoint** and an **HTTP (fs API) endpoint**, both read/write-capable.

---

## Q2. OpenList's storage abstraction: can it be a read/write data backend for JSON files?

- The abstraction is "storages" (drivers) mounted under mount points, unified behind WebDAV + HTTP API. [Fact]
- Writes are core features: web upload, mkdir, rename, move, copy, delete all work against mounted drivers **subject to each driver's write support**. [Fact]
- So yes: a small server running OpenList, with e.g. 139yun mounted, can serve as a read/write JSON-file backend via WebDAV (`PUT`/`MKCOL`) or the fs API (`fs/put`, `fs/mkdir`, `fs/remove`). The song wall's admin/writer could PUT `song-<id>.json` and images through it, and the site could read them. [Inference from [Fact] features]

Caveats for using it as a *database*:

1. **It is a file server, not a database.** No schema, no indexing, no transactions, no atomic rename across drivers, no query layer. "Extensible-variable" fields must be encoded in the JSON files themselves (which is fine - the data shape is just JSON documents, extension is a file-level concern). [Inference]
2. **Requires a 24/7 host.** The user's map says "No separate server/backend (user: too lazy to run services)" - OpenList contradicts that (needs a VPS/box, a netdisk session, uptime, monitoring). [Inference]
3. **Read path for browsers is indirect.** The site reads via the box's HTTP API / WebDAV (a proxy hop), or you generate direct links per file. Not a CDN-native read path. [Inference]

---

## Q3. Comparison: Oracle OSS vs Cloudflare R2 vs OpenList+netdisk

### Oracle Object Storage (PAYG account)

- Always Free (PAYG account, as documented in [heart]): Standard 10GB + IA 10GB + Archive 10GB, **50,000 API requests/month**, **10TB/month outbound (egress) free** at account level. [heart][Fact]
- Oracle's official Free Tier doc: "20 GB combined Standard/IA/Archive" when in Always-Free-only state; **50,000 API requests/month**; "10 TB per month outbound data transfer included". (FreeTrial-with-credits state shows 10GB per tier - matches [heart].) [Fact]
- **S3 Compatibility API** is official and mature: use existing S3 SDKs/tools with minor changes; data written via S3 API is readable via native API and vice versa; uses Customer Secret Key (Access/Secret pair); endpoint `https://<namespace>.compat.objectstorage.<region>.oci.customer-oci.com`. [Fact]
- Public read: buckets can be public with pre-authenticated requests / object public access; commonly fronted by a CDN (heart uses EdgeOne/CF for reads). [heart][Inference]
- Reachability from mainland China: Oracle has no mainland Object Storage region; closest APAC regions (Seoul, Tokyo, Singapore) are reachable from China but latency is mediocre and packet loss is common without optimization. [Inference] (no official China-perf doc found; marked inference)
- **Verdict:** solid, free, S3-compatible; request quota is small (50k/mo), which is plenty for a song wall (a few thousand songs x a few requests each), but reads from mainland benefit from a CDN hop in front. [Inference]

### Cloudflare R2

- Free tier: **10 GB-month Standard storage, 1M Class A requests/mo, 10M Class B requests/mo, and free egress** (no egress charges for any storage class, incl. via S3 API / Workers / r2.dev). [Fact]
- Overage: Standard $0.015/GB-month, Class A $4.50/M, Class B $0.36/M; egress free. [Fact]
- Free tier does not apply to Infrequent Access class (Standard only). [Fact]
- **S3-compatible API** for writes/reads; public buckets via custom domain (full Cloudflare: cache, WAF, Access) or `r2.dev` (non-production, rate-limited). Public buckets cannot list at root of custom domain. [Fact]
- Fits the Bahnhof stack: site is deployed on Cloudflare Pages/Workers (map: EdgeOne Makers / Cloudflare Pages). Workers can read/write R2 natively (Workers R2 bindings) - ideal for a small "admin writes JSON, site reads JSON" flow, no VPS at all. [Fact][Inference]
- Reachability from mainland China: Cloudflare's China Network partnership (JD Cloud) has been discontinued for new customers, so CF edge (including R2/Pages) is reached from China over international routes - typically usable but with higher latency/unstable peaks; heart's CONTEXT.md already accepts CF routing for the 2026-08-02 architecture (its "CF all-in-one stack" pivot) and uses EdgeOne as the China-optimized front. [heart][Inference]
- **Verdict:** best free-tier request quota (1M Class A = 20x Oracle's 50k), free egress, native Workers integration, same vendor as the site's static hosting. [Fact][Inference]

### OpenList + netdisk

- Free (netdisk free tiers + a VPS), huge capacity (139yun, Quark, etc.), domestic bandwidth for downloads (139yun is a China Mobile product). [heart][Fact]
- **Not S3-compatible** natively; exposes WebDAV/HTTP only (Q1). To get "S3", you would stack `rclone serve s3` (experimental) on top of an rclone webdav mount of OpenList - two layers of proxy on one box, single point of failure. [Fact]
- Write support depends on the driver; 139yun/Quark/Alipan write support has historically been flaky (session/logins), and some drives rate-limit or restrict API-driven writes. [Inference]
- Direct links expire (heart's "shixiao-chongsheng" link-regeneration mechanism exists for exactly this reason) - for an object-store-like data layer you want stable, permanent object URLs, not expiring 302s. [heart][Inference]
- ToS/compliance risk: using consumer netdisk accounts as an app's data backend violates most providers' ToS (personal-use accounts, no programmatic mass access). [Inference]
- **Verdict:** wrong tool for a durable, queryable, CDN-served data layer; right tool only for its existing job (heart's large-file 302 distribution). [Inference]

### Comparison table

| Dimension | Oracle OSS (PAYG) | Cloudflare R2 | OpenList+netdisk |
|---|---|---|---|
| Free storage | 30GB (10+10+10 by tier) | 10GB (Standard) | netdisk quota (hundreds GB) |
| Free API requests | 50k/mo | 1M Class A + 10M Class B /mo | unlimited (netdisk API, rate-limited) |
| Free egress | 10TB/mo | unlimited | domestic bandwidth (fast in CN) |
| S3-compatible write | Yes (official) | Yes (official) | No (WebDAV/HTTP only; S3 only via experimental rclone serve s3) |
| Needs a server | No | No | Yes (VPS/box 24/7) |
| Native CDN/edge read | Via own CDN hop | Yes (custom domain, cache) | Via proxy box + expiring links |
| Mainland China read | Mediocre latency w/o CDN | Usable but not CN-optimized (no CN Network) | Best (domestic netdisk bandwidth) |
| Static-site friendliness | High (needs CDN front) | Highest (same vendor as Pages/Workers) | Low (dynamic gateway) |
| Durability | 3 replicas + versioning [Inference] | Multi-region, strong [Inference] | Depends on netdisk account lifecycle |
| Compliance/risk | Low (cloud provider) | Low | Higher (consumer netdisk ToS) |

---

## Q4. "VPS + OpenList converting a netdisk into object storage" - feasibility and pitfalls

Feasible only in a synthetic, fragile sense. [Inference over verified parts below]

- The only honest path to "S3 over netdisk" is `rclone serve s3` (Experimental, since rclone v1.65) with an rclone **webdav** remote pointing at OpenList's WebDAV. rclone serve s3 implements a basic S3 server (SigV4, multipart streaming), supports any rclone remote including WebDAV. Limitations: root dirs = buckets, versioning unsupported, non-atomic remotes leave temp files on interrupted multipart, buggy multipart server-side copies >5G, partial S3 op set. [Fact]
- That is three layers: netdisk API -> OpenList (driver translation) -> rclone webdav mount -> rclone serve s3. Any layer breaks the whole chain. [Inference]
- Pitfalls:
  1. **Netdisk API stability:** 139yun/Quark/AliyunDrive APIs change without notice; drivers break and are hotfixed in the community. [Inference]
  2. **Login/session expiry:** many CN drives need periodic re-login / 2FA re-validation; a headless box must handle it. [Inference]
  3. **Rate limits:** netdisk platforms rate-limit programmatic traffic; a site's read traffic can trip them (this is why heart used the "shixiao-chongsheng" link-regeneration flow + CDN-fronted reads). [heart][Inference]
  4. **Link expiry:** direct 302 links expire; object-store semantics want permanent URLs. [heart]
  5. **Write reliability:** upload/overwrite via WebDAV to a netdisk is non-atomic and slow for many small files; no consistency guarantees. [Inference]
  6. **Compliance:** consumer netdisk ToS generally prohibits use as an app's backend / mass API access. [Inference]
  7. **Cost/ops burden:** you must run, patch, and monitor a VPS 24/7 - contradicts the project's "no separate server/backend" rule. [map][Fact]

Net assessment: **not worth it** for the song wall's small JSON + images. The idea makes sense only for heart's large-file 302 chain (which already exists and works) where files are few, big, and read-mostly. [Inference]

---

## Q5. Final recommendation: where should song wall data live?

**Primary: Cloudflare R2 public bucket** (S3-compatible, free tier 10GB + 1M Class A + free egress, native Workers/Pages integration, same vendor as Bahnhof's static hosting).

- Write path: build-time or an admin script uses the **S3 API** (or a Worker with R2 bindings) to PUT `songs/<slug>.json` and `songs/<slug>/cover.jpg`. "Extensible variables" live naturally inside each JSON document (per-song arbitrary fields - no schema migration, just add keys). [Inference]
- Read path: public bucket behind a custom domain (e.g. `data.isui.ren` or a path on the Bahnhof zone), served through Cloudflare cache. Static Preact site fetches JSON at build or on the client. [Inference]
- Mainland reachability: Cloudflare has no active CN Network for new customers, so treat R2 as "international, CDN-accelerated"; heart already routes China traffic via EdgeOne for the html/asset path - the same pattern can front the data domain (EdgeOne origin pull -> R2). For a song wall (few requests per visit, small payloads) this is fine. [heart][Inference]

**Fallback / alternative: Oracle Object Storage** (S3-compat API, 30GB free across tiers, 10TB/mo free egress). Use it if the user prefers the already-provisioned Oracle PAYG account, or as a second bucket for redundancy. Front it with EdgeOne/CF for China reads. 50k requests/month is enough for a song wall of a few thousand songs with caching. [heart][Fact][Inference]

**Do not** build song wall data on OpenList+netdisk. Keep OpenList exactly where it already is: heart's 302 direct-link chain for large-file distribution. [Inference]

### Suggested decision for ticket

1. Song wall data backend = **Cloudflare R2** (public bucket, custom domain), written via S3 API / Workers; JSON documents carry extensible fields.
2. Optionally mirror to **Oracle OSS** as a second copy (free, already provisioned) - cold-standby redundancy.
3. OpenList+netdisk: out of scope for song wall data; retained only for heart's large-file chain.

---

## Fact vs inference map

- OpenList = AList fork, "Anti Trust Crisis", 24.1k stars, v4.2.4, AGPL-3.0, Go/Gin + SolidJS - **[Fact]** (OpenListTeam/OpenList README, doc.oplist.org)
- Driver list incl. 139yun, Quark, Aliyun Drive, S3 (input-only) - **[Fact]** (OpenList README)
- Client protocols: WebDAV + HTTP API only; no S3/R2 output, no S3 gateway - **[Fact]** (both READMEs, docs tree, Alist issue #7703 shows S3-as-backend only)
- Web upload/mkdir/rename/delete/move/copy are core features - **[Fact]** (README)
- Oracle Free Tier: 50k req/mo, 10TB egress/mo, 20-30GB storage - **[Fact]** (docs.oracle.com FreeTier resourceref; [heart])
- Oracle S3 Compatibility API exists, official, uses Customer Secret Keys - **[Fact]** (docs.oracle.com)
- R2 free tier: 10GB, 1M Class A, 10M Class B, free egress; public buckets via custom domain - **[Fact]** (developers.cloudflare.com/r2)
- rclone serve s3 exists, experimental, serves any remote as S3 - **[Fact]** (rclone.org)
- Cloudflare has no active China Network for new customers; CF from mainland is international-route - **[Inference]** (heavily corroborated by [heart] architecture; not officially confirmed today)
- Oracle OSS latency from mainland - **[Inference]** (no official doc found)
- Netdisk API stability / ToS risk / write flakiness - **[Inference]**
- R2 vs Oracle as best fit - **[Inference]** (supported by facts above)

---

## Ticket resolution

OpenList cannot expose a netdisk as S3-compatible object storage: it is a file-list/WebDAV/HTTP gateway, with S3 appearing only as an input driver, and there is no S3-gateway or R2-output feature. Forcing it into an "object store" requires stacking the experimental `rclone serve s3` over a WebDAV mount - fragile, ToS-risky, and it needs a 24/7 VPS the project explicitly wants to avoid. For the song wall (small extensible-field JSON + images), Cloudflare R2 (free 10GB / 1M Class A / free egress, S3 API, native Workers/Pages fit, same vendor as Bahnhof hosting) is the recommended primary store, with Oracle Object Storage (S3-compatible, free 50k req/mo + 10TB egress) as an optional mirror; reads in mainland China ride the existing EdgeOne/Cloudflare CDN path. OpenList+netdisk stays scoped to heart's 302 large-file chain and is dropped for song wall data.
