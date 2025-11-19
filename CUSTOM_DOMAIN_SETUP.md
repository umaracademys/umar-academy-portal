# 🌐 Custom Domain Setup Guide

Complete guide to add a custom domain (e.g., `portal.umaracademy.org`) to your Umar Academy Portal.

---

## 📋 Prerequisites

1. **Domain Name**: You need to own a domain name (e.g., `umaracademy.org`)
2. **DNS Access**: Access to your domain's DNS settings (usually through your domain registrar)
3. **Render Account**: Your services should be deployed on Render

---

## 🎯 Step-by-Step Setup

### Step 1: Add Custom Domain in Render (Frontend)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your **Frontend Service** (Static Site or Web Service)
3. Click on it → Go to **"Settings"** tab
4. Scroll down to **"Custom Domains"** section
5. Click **"Add Custom Domain"**
6. Enter your domain (e.g., `portal.umaracademy.org`)
7. Click **"Save"**

**Render will show you DNS instructions** - keep this page open!

---

### Step 2: Add Custom Domain in Render (Backend)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Find your **Backend Service** (Web Service)
3. Click on it → Go to **"Settings"** tab
4. Scroll down to **"Custom Domains"** section
5. Click **"Add Custom Domain"**
6. Enter your API subdomain (e.g., `api.umaracademy.org`)
7. Click **"Save"**

**Render will show you DNS instructions** - keep this page open!

---

### Step 3: Configure DNS Records

You need to add DNS records at your domain registrar (e.g., GoDaddy, Namecheap, Cloudflare).

#### Option A: Using CNAME (Recommended)

**For Frontend (`portal.umaracademy.org`):**
1. Go to your domain registrar's DNS management
2. Add a **CNAME** record:
   - **Name/Host:** `portal` (or `@` for root domain)
   - **Value/Target:** `umar-academy-frontend.onrender.com` (or your Render frontend URL)
   - **TTL:** `3600` (or default)

**For Backend (`api.umaracademy.org`):**
1. Add another **CNAME** record:
   - **Name/Host:** `api`
   - **Value/Target:** `umar-academy-backend.onrender.com` (or your Render backend URL)
   - **TTL:** `3600` (or default)

#### Option B: Using A Record (If CNAME not supported)

If you're using the root domain (`umaracademy.org`), you may need **A records**:

1. Render will provide IP addresses in the DNS instructions
2. Add **A** records pointing to those IPs
3. Note: This is less flexible than CNAME

---

### Step 4: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes** for most providers
- You can check propagation status at: https://www.whatsmydns.net

**Verify DNS is working:**
```bash
# Check if DNS is resolving
nslookup portal.umaracademy.org
nslookup api.umaracademy.org
```

---

### Step 5: Update Environment Variables

Once Render detects your DNS is configured (green checkmark), update environment variables:

#### Frontend Environment Variable

1. Go to **Frontend Service** → **"Environment"** tab
2. Find or add: `VITE_API_BASE_URL`
3. Update value to: `https://api.umaracademy.org/api`
   - Replace `api.umaracademy.org` with your actual backend domain
4. Click **"Save Changes"**
5. Service will auto-redeploy

#### Backend Environment Variable

1. Go to **Backend Service** → **"Environment"** tab
2. Find or add: `FRONTEND_URL`
3. Update value to: `https://portal.umaracademy.org`
   - Replace `portal.umaracademy.org` with your actual frontend domain
   - **No trailing slash!**
4. Click **"Save Changes"**
5. Service will auto-redeploy

---

### Step 6: Update render.yaml (Optional)

If you use `render.yaml` for infrastructure as code, update it:

```yaml
services:
  # Backend API Service
  - type: web
    name: umar-academy-backend
    envVars:
      - key: FRONTEND_URL
        value: https://portal.umaracademy.org  # Your custom domain
      # ... other vars

  # Frontend Service
  - type: web
    name: umar-academy-frontend
    envVars:
      - key: VITE_API_BASE_URL
        value: https://api.umaracademy.org/api  # Your custom API domain
      # ... other vars
```

Then commit and push to trigger redeploy.

---

## 🔒 SSL/HTTPS Certificate

**Good News:** Render automatically provisions SSL certificates for custom domains!

- Once DNS is configured, Render will automatically:
  1. Detect your domain
  2. Request an SSL certificate from Let's Encrypt
  3. Configure HTTPS
  4. This usually takes **5-15 minutes**

**Check SSL Status:**
- Go to your service → **"Settings"** → **"Custom Domains"**
- You should see a green checkmark next to "SSL Certificate"

---

## ✅ Verification Steps

### 1. Check DNS Resolution

```bash
# Frontend
curl -I https://portal.umaracademy.org

# Backend
curl https://api.umaracademy.org/api/health
```

Should return HTTP 200 (not 404 or connection error).

### 2. Check SSL Certificate

Visit your domain in a browser:
- Frontend: `https://portal.umaracademy.org`
- Backend: `https://api.umaracademy.org/api/health`

Browser should show a **padlock icon** (secure connection).

### 3. Test Frontend

1. Visit: `https://portal.umaracademy.org`
2. Open browser console (F12)
3. Check Network tab - API calls should go to `https://api.umaracademy.org/api`
4. Try logging in

### 4. Verify Environment Variables

**In browser console (F12):**
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
// Should show: https://api.umaracademy.org/api
```

---

## 🎯 Common Domain Configurations

### Configuration 1: Subdomains (Recommended)

- Frontend: `portal.umaracademy.org`
- Backend: `api.umaracademy.org`

**DNS Records:**
```
portal  CNAME  umar-academy-frontend.onrender.com
api     CNAME  umar-academy-backend.onrender.com
```

### Configuration 2: Root Domain + Subdomain

- Frontend: `umaracademy.org` (root)
- Backend: `api.umaracademy.org`

**DNS Records:**
```
@       CNAME  umar-academy-frontend.onrender.com  (or A records)
api     CNAME  umar-academy-backend.onrender.com
```

### Configuration 3: Different Domains

- Frontend: `portal.umaracademy.org`
- Backend: `backend.umaracademy.com`

**DNS Records:**
```
portal  CNAME  umar-academy-frontend.onrender.com
backend CNAME  umar-academy-backend.onrender.com
```

---

## 🐛 Troubleshooting

### Problem: DNS not resolving

**Solutions:**
1. Wait longer (DNS can take up to 48 hours)
2. Check DNS records are correct (typos, wrong values)
3. Clear DNS cache: `sudo dscacheutil -flushcache` (Mac) or `ipconfig /flushdns` (Windows)
4. Use different DNS server (try Google's 8.8.8.8)

### Problem: SSL certificate not issued

**Solutions:**
1. Ensure DNS is fully propagated (check with `nslookup`)
2. Wait 15-30 minutes after DNS is configured
3. Check Render logs for SSL errors
4. Verify domain is correctly added in Render dashboard

### Problem: CORS errors after domain change

**Solutions:**
1. Verify `FRONTEND_URL` in backend matches your frontend domain exactly
2. No trailing slash in `FRONTEND_URL`
3. Restart backend service
4. Clear browser cache

### Problem: API calls still going to old URL

**Solutions:**
1. Verify `VITE_API_BASE_URL` is updated in Render
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache
4. Check browser console for actual API base URL

### Problem: 404 errors on custom domain

**Solutions:**
1. Verify DNS is pointing to correct Render service
2. Check Render service is running (not sleeping)
3. Verify custom domain is added in Render dashboard
4. Check Render logs for errors

---

## 📝 DNS Record Examples

### GoDaddy

1. Go to **DNS Management**
2. Add records:
   - **Type:** CNAME
   - **Host:** `portal`
   - **Points to:** `umar-academy-frontend.onrender.com`
   - **TTL:** 1 Hour

### Namecheap

1. Go to **Advanced DNS**
2. Add records:
   - **Type:** CNAME Record
   - **Host:** `portal`
   - **Value:** `umar-academy-frontend.onrender.com`
   - **TTL:** Automatic

### Cloudflare

1. Go to **DNS** → **Records**
2. Add records:
   - **Type:** CNAME
   - **Name:** `portal`
   - **Target:** `umar-academy-frontend.onrender.com`
   - **Proxy status:** Proxied (orange cloud) or DNS only (gray cloud)

---

## 🔄 Migration Checklist

- [ ] Custom domain added in Render (Frontend)
- [ ] Custom domain added in Render (Backend)
- [ ] DNS records configured at registrar
- [ ] DNS propagated (verified with `nslookup`)
- [ ] SSL certificates issued (green checkmark in Render)
- [ ] `VITE_API_BASE_URL` updated to custom backend domain
- [ ] `FRONTEND_URL` updated to custom frontend domain
- [ ] Services redeployed
- [ ] Frontend accessible at custom domain
- [ ] Backend API accessible at custom domain
- [ ] Login functionality tested
- [ ] API calls working (check browser console)
- [ ] No CORS errors
- [ ] SSL certificate valid (padlock in browser)

---

## 💡 Best Practices

1. **Use subdomains** (`portal.domain.com`, `api.domain.com`) - easier to manage
2. **Keep Render URLs as fallback** - don't delete them, they're useful for testing
3. **Document your DNS setup** - keep a record of your DNS configuration
4. **Test before going live** - verify everything works with custom domain
5. **Monitor SSL expiration** - Render auto-renews, but good to check occasionally
6. **Use HTTPS everywhere** - never use HTTP for production

---

## 🚀 After Setup

Once your custom domain is working:

1. **Update any documentation** with new URLs
2. **Update email templates** if you send links to users
3. **Update any hardcoded URLs** in your codebase (if any)
4. **Test all features** to ensure nothing broke
5. **Monitor for 24 hours** to catch any issues

---

## 📞 Need Help?

- **Render Support**: https://render.com/docs
- **DNS Issues**: Contact your domain registrar
- **SSL Issues**: Check Render logs and documentation

---

**Your custom domain should be live within 30-60 minutes after DNS configuration!** 🎉

