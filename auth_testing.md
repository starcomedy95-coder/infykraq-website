# Auth Testing Playbook — INFYKRAQ

Two auth methods co-exist:
1. Custom JWT email/password → httpOnly cookie `access_token`
2. Emergent-managed Google login → httpOnly cookie `session_token` (prefix `emg_`), stored in `user_sessions`

`get_current_user` checks `session_token` cookie first, then `access_token` cookie, then Bearer header.

## Step 1: Create test user & Google-style session
```
mongosh --eval "
use('test_database');
var u = db.users.findOne({email:'customer@infykraq.com'});
var t = 'emg_test' + Date.now();
db.user_sessions.insertOne({user_id: u._id.toString(), session_token: t, expires_at: new Date(Date.now()+7*24*3600*1000).toISOString(), created_at: new Date().toISOString()});
print('session_token: ' + t);
"
```

## Step 2: Backend API
```
API=https://premium-ecommerce-126.preview.emergentagent.com
# password login
curl -s -c c.txt -X POST $API/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@infykraq.com","password":"Admin@123"}'
curl -s -b c.txt $API/api/auth/me
# google session token
curl -s $API/api/auth/me -H "Authorization: Bearer <session_token>"
# invalid google session exchange must 401
curl -s -X POST $API/api/auth/session -H "X-Session-ID: bogus" -H "Content-Type: application/json" -d '{}'
```

## Step 3: Browser
```
await page.context.add_cookies([{ "name":"session_token","value":"<token>","domain":"premium-ecommerce-126.preview.emergentagent.com","path":"/","httpOnly":True,"secure":True,"sameSite":"None"}])
await page.goto(API + "/account")
```
Also verify `/login` shows `google-login-btn` and clicking it navigates to auth.emergentagent.com with a `redirect` query equal to `window.location.origin + /account`.
Verify visiting `/account#session_id=fake` renders `auth-callback` then redirects to `/login` with an error toast.

## Checklist
- `session_token` cookie set with path=/, secure, samesite=none
- `expires_at` compared as timezone-aware
- logout clears both cookies and deletes the session row
- Google users get role `customer`; existing email is reused (no duplicate user)
