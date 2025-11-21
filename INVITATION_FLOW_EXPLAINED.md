# Invitation Flow - How It Works

## Normal Flow (When Everything Works Correctly)

```
1. Team Leader sends invitation
   ↓
2. Email sent to invitee with link: https://your-app.vercel.app/invitation/teamId/inviteId
   ↓
3. Invitee clicks "View Invitation" in email
   ↓
4. Browser opens: https://your-app.vercel.app/invitation/teamId/inviteId
   ↓
5. App checks: Is user logged in?
   ├─ YES → Show invitation details with Accept/Decline buttons
   └─ NO → Save returnUrl to sessionStorage
           Show "Login or Create Account" page with buttons
   ↓
6. User clicks "Login" or "Create Account"
   ↓
7. User logs in or signs up
   ↓
8. PublicRoute component checks:
   - User is authenticated? YES
   - returnUrl exists in sessionStorage? YES
   ↓
9. Redirect to returnUrl (the invitation page)
   ↓
10. Show invitation details with Accept/Decline buttons
   ↓
11. User clicks Accept or Decline
   ↓
12. Invitation processed, user redirected to dashboard
```

## Broken Flow (What's Happening Now)

```
1. Team Leader sends invitation
   ↓
2. Email sent to invitee with link: https://your-app.vercel.app/invitation/teamId/inviteId
   ↓
3. Invitee clicks "View Invitation" in email
   ↓
4. Browser opens: https://your-app.vercel.app/invitation/teamId/inviteId
   ↓
5. ⚠️ VERCEL PASSWORD PROTECTION INTERCEPTS ⚠️
   ↓
6. Vercel shows its own login page (NOT your app's login)
   ↓
7. User is confused - this is Vercel's login, not the app's login
   ↓
❌ FLOW BROKEN - User cannot access invitation
```

## Why This Happens

### Vercel Password Protection
When you enable "Password Protection" in Vercel:
- Vercel adds authentication BEFORE your app loads
- ALL pages require the Vercel password first
- This includes invitation links
- Users see Vercel's login page, not your app's login page

### The Fix
**Disable Vercel Password Protection** for production deployments:
1. Go to Vercel Dashboard → Your Project
2. Settings → Deployment Protection
3. Disable "Password Protection"
4. Your app's authentication will handle login

## Code Flow Explanation

### When User Clicks Invitation Link (Not Logged In)

**File:** `src/pages/Invitation.tsx`

```typescript
// Line 164-196: Check if user is logged in
if (!user) {
    // Save the invitation URL to return to after login
    const returnUrl = `/invitation/${teamId}/${invitationId}${action ? `?action=${action}` : ''}`;
    sessionStorage.setItem('returnUrl', returnUrl);
    
    // Show login/signup buttons
    return (
        <div>
            <Button onClick={() => navigate('/login')}>Login</Button>
            <Button onClick={() => navigate('/signup')}>Create Account</Button>
        </div>
    );
}
```

### After User Logs In

**File:** `src/App.tsx`

```typescript
// Line 53-64: PublicRoute checks for returnUrl
if (user) {
    // Check for return URL in sessionStorage
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        console.log('🔙 Redirecting to return URL:', returnUrl);
        return <Navigate to={returnUrl} replace />;
    }
    
    // Default redirect to dashboard
    return <Navigate to="/dashboard" replace />;
}
```

### Invitation Link Generation

**File:** `src/lib/emailService.ts`

```typescript
// Line 395-405: Generate invitation link
export const generateInvitationLink = (teamId: string, inviteId: string): string => {
    // Use environment variable if available (recommended for production)
    // Otherwise fallback to current origin (works for local development)
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    
    console.log('🔗 Generating invitation link with base URL:', baseUrl);
    
    return `${baseUrl}/invitation/${teamId}/${inviteId}`;
};
```

## Environment Variables

### Local Development (.env file)
```env
VITE_APP_URL=http://localhost:5173
```

### Production (Vercel Environment Variables)
```env
VITE_APP_URL=https://your-app-name.vercel.app
```

This ensures:
- Invitation links always use the correct URL
- No hardcoded localhost URLs in production emails
- Consistent behavior across environments

## SessionStorage Explanation

### What is sessionStorage?
- Browser storage that persists for the current tab/window session
- Cleared when tab is closed
- NOT shared between tabs
- Perfect for temporary redirect URLs

### How We Use It
```javascript
// Save return URL before redirecting to login
sessionStorage.setItem('returnUrl', '/invitation/123/456');

// After login, retrieve and use it
const returnUrl = sessionStorage.getItem('returnUrl');
if (returnUrl) {
    sessionStorage.removeItem('returnUrl'); // Clean up
    navigate(returnUrl); // Redirect back
}
```

### Important Notes
- User must use the SAME tab throughout the flow
- Opening invitation in new tab won't preserve returnUrl
- Closing tab will clear the returnUrl
- This is normal browser behavior

## Testing Checklist

### ✅ Correct Behavior
- [ ] Clicking invitation link opens YOUR app (not Vercel login)
- [ ] If not logged in, see YOUR app's login/signup buttons
- [ ] After logging in, automatically redirected to invitation page
- [ ] Can accept or decline invitation
- [ ] After accepting, redirected to dashboard

### ❌ Incorrect Behavior (Needs Fix)
- [ ] Clicking invitation link shows Vercel password page
- [ ] Clicking invitation link shows Vercel authentication
- [ ] After logging in, goes to dashboard (not invitation page)
- [ ] Invitation link in email has wrong domain
- [ ] Invitation link in email has localhost URL

## Quick Diagnostic

Run this in your browser console when on the invitation page:

```javascript
// Check if returnUrl is saved
console.log('Return URL:', sessionStorage.getItem('returnUrl'));

// Check current URL
console.log('Current URL:', window.location.href);

// Check if user is logged in (will show error if not on app page)
console.log('User:', localStorage.getItem('user'));
```

## Summary

**The issue:** Vercel Password Protection is intercepting invitation links

**The fix:** Disable Password Protection in Vercel settings

**The code change:** Added `VITE_APP_URL` environment variable for better control

**The result:** Invitation links work correctly, users can log in and accept invitations
