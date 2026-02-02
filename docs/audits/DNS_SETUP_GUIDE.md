# 🌐 DNS Configuration Guide for uaportal.umaracademy.org

## ❌ Error: DNS_PROBE_FINISHED_NXDOMAIN

This error means **DNS records are not configured** for `uaportal.umaracademy.org`.

---

## ✅ **Solution: Configure DNS Records**

You need to add DNS records pointing `uaportal.umaracademy.org` to your Render service.

---

## **Step 1: Get Your Render Service URL**

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Find your **Frontend Service** (Static Site)
3. Copy the **Render URL** (e.g., `https://umar-academy-frontend-xxxx.onrender.com`)

---

## **Step 2: Configure DNS at Your Domain Registrar**

### **Option A: Using CNAME Record (Recommended)**

1. Log into your **domain registrar** (where you bought `umaracademy.org`)
   - Common registrars: GoDaddy, Namecheap, Google Domains, Cloudflare, etc.

2. Go to **DNS Management** or **DNS Settings**

3. Add a **CNAME Record**:
   - **Name/Host:** `uaportal`
   - **Type:** `CNAME`
   - **Value/Target:** `your-render-service.onrender.com`
   - **TTL:** `3600` (or default)

   **Example:**
   ```
   Name: uaportal
   Type: CNAME
   Value: umar-academy-frontend-xxxx.onrender.com
   ```

4. **Save** the DNS record

### **Option B: Using A Record (If CNAME not supported)**

If your DNS provider doesn't support CNAME for root/subdomain:

1. Get the **IP address** of your Render service:
   - Contact Render support, or
   - Use: `nslookup your-render-service.onrender.com`

2. Add an **A Record**:
   - **Name/Host:** `uaportal`
   - **Type:** `A`
   - **Value:** `[IP address from Render]`
   - **TTL:** `3600`

**⚠️ Note:** A records are less flexible - if Render changes IPs, you'll need to update manually.

---

## **Step 3: Configure Custom Domain in Render**

1. Go to **Render Dashboard** → Your **Frontend Service**
2. Click **"Settings"** tab
3. Scroll to **"Custom Domains"** section
4. Click **"Add Custom Domain"**
5. Enter: `uaportal.umaracademy.org`
6. Click **"Add"**

Render will verify the DNS configuration. This may take a few minutes.

---

## **Step 4: Wait for DNS Propagation**

DNS changes can take **15 minutes to 48 hours** to propagate globally.

**Check DNS propagation:**
- Visit: https://www.whatsmydns.net
- Enter: `uaportal.umaracademy.org`
- Check if it resolves to your Render service

---

## **Step 5: SSL Certificate (Automatic)**

Render will automatically provision an SSL certificate once DNS is configured correctly. This usually takes **5-15 minutes** after DNS propagation.

---

## 🐛 **Troubleshooting**

### Issue: DNS still not working after 24 hours

**Check:**
1. DNS records are saved correctly (no typos)
2. CNAME value matches Render service URL exactly
3. TTL is set (not 0 or empty)
4. No conflicting records (multiple A or CNAME records)

### Issue: Render says "DNS not configured"

**Check:**
1. DNS record is **CNAME** pointing to Render service
2. Record name is exactly `uaportal` (not `uaportal.umaracademy.org`)
3. Wait 15-30 minutes after adding DNS record
4. Check DNS propagation: https://www.whatsmydns.net

### Issue: Site loads but shows "Not Found"

**Fix:**
1. Make sure custom domain is added in Render dashboard
2. Check Render service is running (not suspended)
3. Verify environment variables are set correctly

---

## 📋 **Quick Checklist**

- [ ] Added CNAME record: `uaportal` → `your-render-service.onrender.com`
- [ ] Added custom domain in Render dashboard: `uaportal.umaracademy.org`
- [ ] Waited 15-30 minutes for DNS propagation
- [ ] Verified DNS propagation: https://www.whatsmydns.net
- [ ] Checked Render service is running
- [ ] SSL certificate provisioned (check Render dashboard)

---

## 🔍 **Verify DNS Configuration**

### Using Command Line:

```bash
# Check DNS resolution
nslookup uaportal.umaracademy.org

# Should show your Render service URL
dig uaportal.umaracademy.org CNAME
```

### Using Online Tools:

1. **DNS Checker:** https://www.whatsmydns.net
2. **DNS Propagation:** https://dnschecker.org
3. **MXToolbox:** https://mxtoolbox.com/DNSLookup.aspx

---

## 🆘 **Still Not Working?**

Share these details:
1. Your domain registrar name
2. Screenshot of DNS records you added
3. Your Render service URL
4. Error message you're seeing
5. How long you've waited since adding DNS records

---

## 📝 **Common DNS Providers Setup**

### **Cloudflare:**
1. Login → Select domain → **DNS** → **Records**
2. Click **"Add record"**
3. Type: `CNAME`, Name: `uaportal`, Target: `your-render-service.onrender.com`
4. Proxy status: **DNS only** (gray cloud) or **Proxied** (orange cloud)
5. Save

### **GoDaddy:**
1. Login → **My Products** → **DNS** → **Manage DNS**
2. Click **"Add"** under Records
3. Type: `CNAME`, Name: `uaportal`, Value: `your-render-service.onrender.com`
4. TTL: `1 Hour`
5. Save

### **Namecheap:**
1. Login → **Domain List** → **Manage** → **Advanced DNS**
2. Click **"Add New Record"**
3. Type: `CNAME Record`
4. Host: `uaportal`, Value: `your-render-service.onrender.com`
5. TTL: `Automatic`
6. Save

### **Google Domains:**
1. Login → **DNS** → **Custom resource records**
2. Click **"Manage custom records"**
3. Add: Name: `uaportal`, Type: `CNAME`, Data: `your-render-service.onrender.com`
4. Save

---

## ⚡ **Quick Test**

After configuring DNS, test with:

```bash
curl -I https://uaportal.umaracademy.org
```

Should return HTTP 200 or 301/302 redirect.

