# Invitation Redirect Issue - Diagnosis & Fix

## Problem
When users click "View Invitation" from the email, they are being redirected to Vercel's login page instead of the project's login page.

## Root Cause Analysis

### Possible Causes:

1. **Vercel Password Protection Enabled**
   - Vercel allows you to add password protection to deployments
   - This creates a Vercel login page BEFORE users can access your app
   - Check: Vercel Dashboard → Your Project → Settings → Deployment Protection

2. **Wrong Domain in Email Links**
   - The invitation links might be using a Vercel preview URL instead of production URL
   - Preview URLs (e.g., `project-name-git-branch-username.vercel.app`) may have different auth settings

3. **Environment Variable Issues**
   - If you're using environment variables for the base URL, they might not be set correctly in production

## How to Fix

### Step 1: Check Vercel Deployment Protection

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Deployment Protection**
4. Make sure **Password Protection** is **DISABLED** for production
5. If you need protection, use **Vercel Authentication** instead, which integrates with your app

### Step 2: Verify Invitation Links Are Using Production URL

The code currently uses `window.location.origin` to generate invitation links, which should work correctly. However, to ensure production URLs are always used, we can add an environment variable:

1. Add to your `.env` file (for local development):
   ```env
   VITE_APP_URL=http://localhost:5173
   ```

2. Add to Vercel Environment Variables (for production):
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `VITE_APP_URL` = `https://your-production-domain.vercel.app`
   - Make sure it's set for **Production** environment

### Step 3: Update Code to Use Environment Variable (Optional but Recommended)

If you want to ensure the invitation links always use the production URL regardless of where the email is sent from, update the `generateInvitationLink` function:

**File:** `src/lib/emailService.ts` (line 395-398)

**Current Code:**
```typescript
export const generateInvitationLink = (teamId: string, inviteId: string): string => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invitation/${teamId}/${inviteId}`;
};
```

**Updated Code:**
```typescript
export const generateInvitationLink = (teamId: string, inviteId: string): string => {
    // Use environment variable if available, fallback to window.location.origin
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/invitation/${teamId}/${inviteId}`;
};
```

### Step 4: Test the Flow

1. **Send a test invitation** from your production deployment
2. **Check the email** - verify the link points to your production domain
3. **Click "View Invitation"** - should go to your app's invitation page
4. **If not logged in** - should show your app's login/signup buttons
5. **After login** - should redirect back to the invitation page

## Debugging Steps

If the issue persists, check these:

### 1. Check Browser Console
When you click the invitation link, open browser DevTools (F12) and check:
- What URL are you being redirected to?
- Are there any console errors?
- Check the Network tab for redirects

### 2. Check SessionStorage
After clicking the invitation link (while not logged in):
1. Open DevTools → Application tab → Session Storage
2. Look for `returnUrl` - it should contain the invitation URL
3. After logging in, this should be used for redirect

### 3. Verify Email Link
Check the actual link in the email you received:
- Does it point to your production domain?
- Or does it point to a preview/branch deployment?
- Or does it point to localhost?

### 4. Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on your production deployment
3. Check the **Functions** tab for any errors
4. Check the **Runtime Logs** for redirect issues

## Quick Fix: Disable Vercel Password Protection

**Most Common Solution:**

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Deployment Protection
4. **Disable** "Password Protection"
5. Click **Save**
6. Redeploy your application

This will remove the Vercel login page and allow users to access your app directly.

## Alternative: Use Vercel Authentication

If you need deployment protection but want it to work with your app:

1. Enable **Vercel Authentication** instead of Password Protection
2. This integrates with your app's authentication
3. Users will be authenticated through your app, not Vercel's login page

## Still Having Issues?

If none of the above works, please provide:
1. The actual URL from the invitation email
2. Screenshot of what page users see when clicking the link
3. Any console errors from browser DevTools
4. Your Vercel deployment protection settings

This will help diagnose the exact issue.
