# 🔧 QUICK FIX: Invitation Redirect Issue

## The Problem
When users click "View Invitation" from the email, they're being redirected to **Vercel's login page** instead of **your app's login page**.

## The Solution (90% of cases)

### ⚡ Quick Fix - Disable Vercel Password Protection

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click **Settings** (left sidebar)
4. Click **Deployment Protection**
5. Find **"Password Protection"** or **"Vercel Authentication"**
6. **TURN IT OFF** (disable it)
7. Click **Save**
8. **Redeploy** your app (or push a new commit)

**That's it!** This fixes the issue in most cases.

---

## Additional Fix - Set Production URL

To ensure invitation links always use the correct URL:

### Add Environment Variable in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your project
3. Click **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Name:** `VITE_APP_URL`
   - **Value:** `https://your-actual-app-url.vercel.app`
   - **Environments:** Check all (Production, Preview, Development)
6. Click **Save**
7. **Redeploy** your app

---

## How to Test

1. **Send a test invitation** from your production app
2. **Check the email** - the link should be `https://your-app.vercel.app/invitation/...`
3. **Open in incognito window** (to test as a new user)
4. **Click "View Invitation"** - should show YOUR app's page, not Vercel login
5. **Click "Login"** - should show YOUR app's login form
6. **Log in** - should redirect back to the invitation page
7. **Accept invitation** - should work!

---

## What Changed in the Code

I made one small update to ensure invitation links use the correct URL:

**File:** `src/lib/emailService.ts`

**Before:**
```typescript
const baseUrl = window.location.origin;
```

**After:**
```typescript
const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
```

This means:
- If `VITE_APP_URL` is set → use that (production URL)
- If not set → use current URL (works for local development)

---

## Files Created

I've created 3 detailed guides for you:

1. **INVITATION_REDIRECT_FIX.md** - Comprehensive troubleshooting guide
2. **VERCEL_INVITATION_SETUP.md** - Step-by-step Vercel setup
3. **INVITATION_FLOW_EXPLAINED.md** - How the invitation flow works

---

## Still Not Working?

If you've disabled Password Protection and set the environment variable, but it's still not working:

1. **Check the email link:**
   - Open the invitation email
   - What URL does "View Invitation" point to?
   - Share it (remove sensitive parts)

2. **Check browser console:**
   - Press F12 to open DevTools
   - Click the invitation link
   - Any errors in the Console tab?

3. **Check Vercel settings:**
   - Is Password Protection really disabled?
   - Is the environment variable set correctly?
   - Did you redeploy after making changes?

---

## Summary

**Most likely cause:** Vercel Password Protection is enabled

**Quick fix:** Disable it in Vercel Dashboard → Settings → Deployment Protection

**Better fix:** Also set `VITE_APP_URL` environment variable in Vercel

**Result:** Invitation links will work correctly! 🎉
