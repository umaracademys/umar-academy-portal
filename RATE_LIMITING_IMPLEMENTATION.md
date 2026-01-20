# Rate Limiting Implementation

## Summary
Implemented comprehensive per-user and per-IP rate limiting for:
- ✅ Authentication routes
- ✅ Ticket creation
- ✅ Assignment submission
- ✅ List endpoints

**Key Features:**
- Per-user AND per-IP tracking (both limits must be respected)
- Admin exemption (admins are not rate limited)
- Safe defaults (reasonable limits for production)
- Development-friendly (more lenient in development mode)

## Rate Limiting Middleware

### File: `backend/middleware/rateLimiting.js`

**Features:**
1. **Combined Limiting**: Tracks both user ID and IP address separately
2. **Admin Exemption**: Admins and superadmins bypass all rate limits
3. **Environment-Aware**: More lenient limits in development
4. **Safe Defaults**: Conservative limits for production

## Rate Limiters Created

### 1. Authentication Routes
**Limiter**: `combinedAuthLimiter`
- **Window**: 15 minutes
- **Production Limit**: 5 requests per user AND per IP
- **Development Limit**: 20 requests per user AND per IP
- **Applied To**:
  - `POST /api/auth/login`
  - `POST /api/auth/password-reset-request`
  - `POST /api/auth/password-reset`

**Purpose**: Prevents brute force attacks on authentication endpoints

### 2. Ticket Creation
**Limiter**: `combinedTicketCreationLimiter`
- **Window**: 1 hour
- **Production Limit**: 10 tickets per user AND per IP
- **Development Limit**: 50 tickets per user AND per IP
- **Applied To**:
  - `POST /api/tickets`

**Purpose**: Prevents spam ticket creation

### 3. Assignment Submission
**Limiter**: `combinedAssignmentSubmissionLimiter`
- **Window**: 1 hour
- **Production Limit**: 20 submissions per user AND per IP
- **Development Limit**: 100 submissions per user AND per IP
- **Applied To**:
  - `POST /api/assignments/:id/submit-homework`

**Purpose**: Prevents spam assignment submissions

### 4. List Endpoints
**Limiter**: `combinedListEndpointLimiter`
- **Window**: 1 minute
- **Production Limit**: 30 requests per user AND per IP
- **Development Limit**: 100 requests per user AND per IP
- **Applied To**:
  - `GET /api/users`
  - `GET /api/students`
  - `GET /api/teachers`
  - `GET /api/admins`
  - `GET /api/assignments`
  - `GET /api/tickets`
  - `GET /api/recitation-reviews`
  - `GET /api/weekly-evaluations`

**Purpose**: Prevents excessive data fetching and DoS attacks

## How It Works

### Combined Limiting
The combined limiters track **both** user ID and IP address separately:

1. **If user is authenticated**: 
   - User ID limit is checked
   - IP address limit is checked
   - **Both** limits must be respected

2. **If user is not authenticated**:
   - Only IP address limit is checked

### Admin Exemption
Admins and superadmins are automatically exempt from all rate limiting:
```javascript
const isAdmin = (req) => {
  if (!req.user) return false;
  const role = req.user.role;
  return role === 'admin' || role === 'superadmin';
};
```

### Development Mode
In development mode:
- More lenient limits (higher max values)
- Localhost IPs are exempt from rate limiting
- Easier testing and development

## Rate Limit Response

When rate limit is exceeded, the response is:
```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 900,
  "limit": 5,
  "window": 15
}
```

Status Code: `429 Too Many Requests`

Headers:
- `X-RateLimit-Limit`: Maximum number of requests
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)
- `Retry-After`: Seconds to wait before retrying

## Security Benefits

### Before
- ❌ Only IP-based rate limiting
- ❌ No per-user tracking
- ❌ Admins subject to same limits
- ❌ No protection for list endpoints
- ❌ No protection for ticket creation
- ❌ No protection for assignment submission

### After
- ✅ Per-user AND per-IP tracking
- ✅ Admins exempt from rate limiting
- ✅ List endpoints protected
- ✅ Ticket creation protected
- ✅ Assignment submission protected
- ✅ Authentication routes have strict limits
- ✅ Prevents abuse from both authenticated and unauthenticated users

## Implementation Details

### Middleware Order
Rate limiting is applied **before** authentication for public endpoints:
1. `combinedAuthLimiter` (for auth routes)
2. `authenticateToken` (for protected routes)
3. `combinedTicketCreationLimiter` / `combinedAssignmentSubmissionLimiter` / `combinedListEndpointLimiter`
4. `requirePermission` (if applicable)
5. Route handler

### Key Generation
- **Authenticated users**: `user:${userId}`
- **Unauthenticated users**: `ip:${ipAddress}`

### Storage
Rate limiting uses in-memory storage by default (express-rate-limit). For production with multiple servers, consider using Redis:
```javascript
const RedisStore = require('rate-limit-redis');
const redisClient = require('redis').createClient();

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient
  }),
  // ... other options
});
```

## Safe Defaults

All limits are conservative to prevent abuse while allowing legitimate use:

| Endpoint Type | Window | Production Limit | Development Limit |
|--------------|--------|------------------|-------------------|
| Authentication | 15 min | 5 requests | 20 requests |
| Ticket Creation | 1 hour | 10 requests | 50 requests |
| Assignment Submission | 1 hour | 20 requests | 100 requests |
| List Endpoints | 1 minute | 30 requests | 100 requests |

## Testing

To test rate limiting:

1. **Authentication Rate Limiting**:
   ```bash
   # Make 6 login attempts quickly
   for i in {1..6}; do
     curl -X POST http://localhost:3001/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}'
   done
   # 6th request should return 429
   ```

2. **Ticket Creation Rate Limiting**:
   ```bash
   # Create 11 tickets quickly (with valid auth token)
   for i in {1..11}; do
     curl -X POST http://localhost:3001/api/tickets \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"studentId":"...","studentName":"...","type":"sabq"}'
   done
   # 11th request should return 429
   ```

3. **List Endpoint Rate Limiting**:
   ```bash
   # Make 31 list requests quickly
   for i in {1..31}; do
     curl http://localhost:3001/api/users \
       -H "Authorization: Bearer $TOKEN"
   done
   # 31st request should return 429
   ```

## Files Modified

1. ✅ `backend/middleware/rateLimiting.js` - **NEW FILE** - Rate limiting middleware
2. ✅ `backend/server.js` - Added rate limiting to routes

## Routes Protected

### Authentication Routes (3 routes)
- ✅ `POST /api/auth/login`
- ✅ `POST /api/auth/password-reset-request`
- ✅ `POST /api/auth/password-reset`

### Ticket Creation (1 route)
- ✅ `POST /api/tickets`

### Assignment Submission (1 route)
- ✅ `POST /api/assignments/:id/submit-homework`

### List Endpoints (8 routes)
- ✅ `GET /api/users`
- ✅ `GET /api/students`
- ✅ `GET /api/teachers`
- ✅ `GET /api/admins`
- ✅ `GET /api/assignments`
- ✅ `GET /api/tickets`
- ✅ `GET /api/recitation-reviews`
- ✅ `GET /api/weekly-evaluations`

## Next Steps

Consider:
1. **Redis Storage**: For multi-server deployments
2. **Dynamic Limits**: Adjust limits based on user role or subscription
3. **Whitelist**: Add trusted IPs that bypass rate limiting
4. **Monitoring**: Track rate limit hits for security analysis
5. **Custom Limits**: Allow admins to configure limits per endpoint
