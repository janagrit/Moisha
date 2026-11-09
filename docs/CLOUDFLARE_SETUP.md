# Private deployment on Cloudflare Pages and Access

Prepared for review. Nothing here has been run, and no deployment exists.

Cloudflare's menus and free-plan terms change, so confirm each limit in the dashboard when you do this.

## Before you start

1. Make the GitHub repository private.
2. Decide which branch is production.
3. **Choose the final web address before entering real data.** Browser data belongs to one address, and moving later means backing up and restoring on every device.

## 1. Create the Pages project

Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.

When GitHub asks for access, choose **Only select repositories** and pick this repository.

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | leave empty (repository root) |
| Build command | `npm run build` |
| Build output directory | `frontend/dist` |
| Environment variable | `NODE_VERSION` = `22` |
| Production branch | your chosen branch |

No secrets or other environment variables are needed.

Limit preview builds to your production branch, or turn them off, so other branches do not get their own web addresses.

`frontend/public/_headers` sets the security headers automatically.

## 2. Restrict it with Cloudflare Access

Zero Trust dashboard, free plan. **Read the checkout screen before accepting**, because community reports say it may ask for authorization covering usage beyond the free allowance.

1. Under Integrations → Identity providers, add **One-time PIN**. Newer accounts do not include it automatically.
2. In the Pages project → Settings → General → Access policy, enable the policy.
3. Enabling it protects only preview addresses. To protect the main `<project>.pages.dev` address, follow Cloudflare's [Known issues](https://developers.cloudflare.com/pages/platform/known-issues/) steps, which edit the generated Access application to remove the wildcard from its hostname.
4. Set the policy to **Allow**, with **Emails** listing exactly your address and your manager's. Do not allow a whole email domain.
5. Choose a session length. A month keeps logins rare on a phone.
6. Confirm the setup: open the address in a private window and check that a code is required, and that an unlisted email is refused.

## 3. What Access does and does not do with offline use

- Access is checked only when the app reaches the network.
- After the first visit, the installed app opens from its own cache, with or without a valid login. **Offline use keeps working when a session expires.**
- When a session has expired, update checks are redirected to login and fail. The cached version keeps running, and no update arrives until that person logs in again in the browser.
- **Removing someone from the policy stops future access, not what is already on their device.** Their cached app and saved data remain.
- Property data is never on Cloudflare. It stays on each device, encrypted with that person's passcode, and backups are encrypted separately.
- Nothing can be deleted from someone else's device remotely.

## 4. Test on real devices

- [ ] Log in with an emailed code on each phone.
- [ ] Install to the Home Screen or with the browser's Install option.
- [ ] Open once online, then turn on airplane mode, close the app and reopen it.
- [ ] Confirm saved data appears and the header says offline.
- [ ] Make an encrypted backup on one device and restore it on the other.
- [ ] Publish a small change and confirm the Refresh banner appears.

## 5. Public portfolio demo (a separate project)

The demo is a second Cloudflare Pages project with its own web address. It is a different build, not a setting on the production app.

| | Production | Public demo |
|---|---|---|
| Pages project | `<your-app-name>` | `<your-app-name>-demo` |
| Build command | `npm run build` | `npm run build:demo` |
| Output directory | `frontend/dist` | `frontend/dist-demo` |
| Cloudflare Access | Required | None |
| Web address | Its own | Its own |

Rules that keep them apart:

- **Never put the two on the same web address or under the same path.** Separate addresses are what stop browsers sharing storage between them.
- Create the Access application for the production hostname only. Never use a wildcard covering both.
- Do not link one site from the other in a way that passes data.
- Never add a real property, screenshot or backup to the repository, because the demo is built from the same code.

After deploying, confirm the demo opens in a private window with no login, and that the banner says fictional data.

**Not ready to deploy.** The demo currently shows a plain "M" avatar and contains no mascot image. Keep it that way until the Airbnb logo is removed from the mascot artwork and its usage rights are confirmed.

## Costs to keep an eye on

Free-plan limits when this was written: 50 Zero Trust users, 500 Pages builds a month, 20,000 files per site. Moisha needs 2 users and a handful of builds. Static file requests are free.

Cloudflare now recommends Workers Static Assets for new sites but says Pages continues to work. This guide uses Pages as requested.
