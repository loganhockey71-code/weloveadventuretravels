# Connecting the Admin Panel to Netlify

The admin panel can edit the site and publish changes straight to your live Netlify
site — no GitHub account needed. It does this using a Netlify access token, which
you generate once.

## 1. Get a Personal Access Token

1. Log in to [app.netlify.com](https://app.netlify.com)
2. Click your account name (top right) → **User settings**
3. Go to **Applications** → **Personal access tokens** → **New access token**
4. Give it a name like "Site Admin Panel" and click **Generate token**
5. Copy the token immediately — Netlify only shows it once

## 2. Get your Site ID

1. In the Netlify dashboard, open the site (weloveadventuretravels)
2. Go to **Site configuration** → **General** → **Site details**
3. Copy the **Site ID** (looks like `a1b2c3d4-e5f6-...`)

## 3. Add both to `.env`

Open the `.env` file in this folder (create it if it doesn't exist yet — running
`npm run setup` creates one automatically) and fill in:

```
NETLIFY_AUTH_TOKEN=paste-your-token-here
NETLIFY_SITE_ID=paste-your-site-id-here
```

Restart the admin server (`npm start`) after editing `.env`.

## 4. Publish

Once both values are set, the **Publish to Live Site** button on the admin
dashboard will push the current pages live. It usually takes under a minute to
go live after clicking it.

Keep the token secret — anyone with it can deploy to your site. The `.env` file
is excluded from version control (`.gitignore`) so it's never accidentally shared.
