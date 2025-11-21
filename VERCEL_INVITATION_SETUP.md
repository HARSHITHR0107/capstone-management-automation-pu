# Vercel Deployment Setup - Invitation Links Fix

## Quick Fix Steps

### 1. Check Vercel Password Protection (MOST COMMON ISSUE)

**This is likely your issue!** Vercel's password protection creates a login page BEFORE users can access your app.

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Deployment Protection**
4. Look for **"Password Protection"** or **"Vercel Authentication"**
5. **DISABLE** it or switch to a different protection method
6. Click **Save**

### 2. Set Environment Variable in Vercel

To ensure invitation links always use your production URL:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:
   - **Name:** `VITE_APP_URL`
   - **Value:** `https://your-app-name.vercel.app` (replace with your actual Vercel URL)
   - **Environment:** Select **Production**, **Preview**, and **Development**
6. Click **Save**

### 3. Redeploy Your Application

After making the above changes:

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click the **⋯** menu → **Redeploy**
4. Or push a new commit to trigger a deployment

## Testing the Fix

### Test 1: Check Deployment Protection
1. Open your production URL in an **incognito/private window**
2. You should see your app's landing page, NOT a Vercel login page
3. If you see a Vercel login page, go back to Step 1 above

### Test 2: Send a Test Invitation
1. Log in to your app
2. Create a team and send an invitation
3. Check the email - the link should be: `https://your-app.vercel.app/invitation/...`
4. Click the link - it should go to your app's invitation page
5. If not logged in, you should see YOUR app's login/signup buttons

### Test 3: Complete the Flow
1. Click "Login" or "Create Account" from the invitation page
2. Log in or sign up
3. You should be redirected BACK to the invitation page
4. Accept or decline the invitation

## Common Issues & Solutions

### Issue 1: "Vercel Login Page" Appears
**Symptom:** When clicking invitation link, you see a Vercel login page asking for a password

**Solution:** Disable Password Protection in Vercel Settings → Deployment Protection

### Issue 2: Invitation Link Points to Wrong URL
**Symptom:** Email contains link like `http://localhost:5173/invitation/...` or wrong domain

**Solution:** 
1. Set `VITE_APP_URL` environment variable in Vercel (see Step 2 above)
2. Make sure you're sending invitations from the PRODUCTION deployment, not local

### Issue 3: After Login, Not Redirected to Invitation
**Symptom:** After logging in, you go to dashboard instead of invitation page

**Solution:** This is a browser issue. The `sessionStorage` might be cleared. Try:
1. Use the same browser/tab throughout the flow
2. Don't open the invitation link in a new window
3. Check browser console for errors

### Issue 4: Preview Deployments Have Different URL
**Symptom:** Invitations sent from preview deployments have preview URLs

**Solution:** This is expected. Only send invitations from production deployment. Or set `VITE_APP_URL` to always use production URL.

## Environment Variables Reference

Add these to your Vercel project:

```env
# Required for EmailJS
VITE_EMAILJS_SERVICE_ID=your_service_id
VITE_EMAILJS_TEMPLATE_ID=your_template_id
VITE_EMAILJS_PUBLIC_KEY=your_public_key

# Required for correct invitation links
VITE_APP_URL=https://your-app-name.vercel.app
```

## Vercel Deployment Protection Options

### Option 1: No Protection (Recommended for this app)
- **Best for:** Public applications with their own authentication
- **Setup:** Disable all protection in Settings → Deployment Protection
- **Result:** Users access your app directly, use your login system

### Option 2: Vercel Authentication
- **Best for:** Apps that need extra security layer
- **Setup:** Enable "Vercel Authentication" in Settings → Deployment Protection
- **Result:** Users authenticate through Vercel first, then your app
- **Note:** May cause issues with invitation flow

### Option 3: Password Protection
- **Best for:** Staging/preview environments
- **Setup:** Enable "Password Protection" in Settings → Deployment Protection
- **Result:** Users need password to access ANY page
- **Note:** Will break invitation links! Not recommended for production

## Debugging Checklist

If invitation links still don't work:

- [ ] Vercel Password Protection is DISABLED
- [ ] `VITE_APP_URL` is set in Vercel environment variables
- [ ] Application has been redeployed after setting environment variables
- [ ] Invitation email contains correct production URL
- [ ] Clicking invitation link goes to YOUR app, not Vercel login
- [ ] Login/Signup buttons on invitation page work correctly
- [ ] After login, user is redirected back to invitation page
- [ ] Browser console shows no errors

## Still Having Issues?

If you've tried everything above and it still doesn't work:

1. **Check the actual email link:**
   - Open the invitation email
   - Right-click "View Invitation" button
   - Copy link address
   - Share the link (remove sensitive IDs if needed)

2. **Check browser console:**
   - Open DevTools (F12)
   - Click the invitation link
   - Check Console tab for errors
   - Check Network tab for redirects
   - Share any error messages

3. **Check Vercel logs:**
   - Go to Vercel Dashboard → Deployments
   - Click on production deployment
   - Check Runtime Logs for errors

4. **Verify environment variables:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Make sure `VITE_APP_URL` is set correctly
   - Make sure it's enabled for "Production" environment

## Summary

**Most likely fix:** Disable Vercel Password Protection in your project settings.

**Second most likely fix:** Set `VITE_APP_URL` environment variable in Vercel to your production URL.

After making changes, always **redeploy** your application for them to take effect.
