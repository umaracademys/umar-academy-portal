# Input Validation Implementation

## Summary
Implemented comprehensive input validation using express-validator for all POST, PUT, and PATCH routes. The validation enforces:
- ✅ ID validation (MongoDB ObjectIds and custom IDs)
- ✅ Email validation
- ✅ Max length enforcement
- ✅ Unknown field rejection
- ✅ Standardized validation error responses

## Enhanced Validation Middleware

### File: `backend/middleware/validateRequest.js`

**New Features:**
1. **Unknown Field Rejection**: Rejects unknown fields in request body
2. **Standardized Error Format**: Consistent error responses across all routes
3. **Enhanced Validation Rules**: More comprehensive rule set

**Enhanced Rules:**
- `mongoId(field, location)` - Validates MongoDB ObjectIds in params or body
- `customId(field, location, pattern)` - Validates custom ID formats
- `email(field, required)` - Email validation with normalization
- `requiredString(field, minLength, maxLength)` - String with min/max length
- `optionalString(field, maxLength)` - Optional string with max length
- `arrayOfStrings(field, maxLength)` - Array of strings with max item length
- `arrayOfMongoIds(field, maxItems)` - Array of MongoDB ObjectIds with max items
- `enum(field, values)` - Enum validation
- `number(field, min, max)` - Number with range validation
- `date(field, required)` - ISO 8601 date validation
- `url(field, required)` - URL validation

## Standardized Error Response Format

All validation errors return:
```json
{
  "error": "Validation failed",
  "message": "Please check your input and try again",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "value": "invalid-email"
    }
  ]
}
```

Status Code: `400 Bad Request`

## Routes with Validation Added

### User Management Routes

1. ✅ **POST /api/users**
   - Validates: email, name, role, password, avatar
   - Max lengths: name (255), avatar (500)
   - Rejects unknown fields

2. ✅ **PUT /api/users/:id**
   - Validates: id (MongoDB ObjectId), name, email, avatar
   - Max lengths: name (255), avatar (500)
   - Rejects unknown fields

3. ✅ **POST /api/students**
   - Validates: email, fullName, contact, parentName, program
   - Max lengths: fullName (255), contact (50), parentName (255), program (100)
   - Array validations: assignedTeacherIds (max 50 items)
   - Rejects unknown fields

4. ✅ **PUT /api/students/:id**
   - Validates: id (MongoDB ObjectId), fullName, email, contact, etc.
   - Max lengths enforced
   - Rejects unknown fields

### Assignment Routes

5. ✅ **POST /api/assignments**
   - Validates: studentId, studentName, ticketId, type, status
   - Max lengths: studentId (100), studentName (255), ticketId (100), type (50), status (50)
   - Rejects unknown fields

6. ✅ **PUT /api/assignments/:id**
   - Validates: id (MongoDB ObjectId), type, status, dueDate
   - Enum validation for status
   - Date validation for dueDate
   - Rejects unknown fields

### Ticket Routes

7. ✅ **POST /api/tickets**
   - Validates: studentId, studentName, type, assignedTeacherId, etc.
   - Required fields: studentId, studentName, type
   - Enum validation: type (sabq, sabqi, manzil)
   - Max lengths enforced
   - Rejects unknown fields

8. ✅ **PUT /api/tickets/:id**
   - Validates: id (MongoDB ObjectId), status, assignedTeacherId, etc.
   - Enum validation for status
   - Rejects unknown fields

### Evaluation Routes

9. ✅ **POST /api/recitation-reviews**
   - Validates: studentId, studentName, teacherName, recitationType, notes
   - Required fields: studentId, studentName, teacherName, recitationType
   - Enum validation: recitationType (sabq, sabqi, manzil)
   - Max length: notes (5000)
   - Rejects unknown fields

10. ✅ **PUT /api/recitation-reviews/:id**
    - Validates: id (MongoDB ObjectId), studentId, studentName, etc.
    - Max lengths enforced
    - Rejects unknown fields

11. ✅ **POST /api/weekly-evaluations**
    - Validates: studentId, studentName, weekStartDate, weekEndDate, etc.
    - Required fields: studentId, studentName, weekStartDate, weekEndDate
    - Max lengths: text fields (5000 chars each)
    - Rejects unknown fields

12. ✅ **PUT /api/weekly-evaluations/:id**
    - Validates: id (custom ID), studentId, studentName, etc.
    - Max lengths enforced
    - Rejects unknown fields

## Validation Rules Summary

### ID Validation
- **MongoDB ObjectIds**: `commonRules.mongoId('id')` - Validates 24-character hex string
- **Custom IDs**: `commonRules.customId('id', 'param', pattern)` - Validates custom ID patterns

### Email Validation
- **Format**: Validates RFC 5322 compliant email addresses
- **Normalization**: Automatically normalizes email (lowercase, trim)
- **Max Length**: 255 characters
- **Required/Optional**: Can be required or optional

### String Validation
- **Min Length**: Enforced for required strings
- **Max Length**: Enforced for all strings (prevents DoS attacks)
- **Trimming**: Automatic whitespace trimming
- **Common Max Lengths**:
  - Names: 255 characters
  - Contacts: 50 characters
  - URLs: 2048 characters
  - Notes/Descriptions: 5000 characters

### Array Validation
- **Array of Strings**: Validates each item is a string with max length
- **Array of MongoDB ObjectIds**: Validates each item is a valid ObjectId
- **Max Items**: Prevents large arrays that could cause performance issues

### Enum Validation
- **Allowed Values**: Validates value is in allowed list
- **Clear Error Messages**: Lists all allowed values in error message

### Number Validation
- **Range Validation**: Optional min/max values
- **Type Validation**: Ensures numeric values

### Date Validation
- **ISO 8601 Format**: Validates standard date format
- **Required/Optional**: Can be required or optional

### URL Validation
- **Format**: Validates URL format
- **Max Length**: 2048 characters

## Unknown Field Rejection

When `allowedFields` array is provided to `validateRequest()`, any fields not in the allowed list are rejected:

```javascript
validateRequest([
  // validations
], ['name', 'email', 'role']) // Only these fields allowed
```

**Error Response:**
```json
{
  "error": "Validation failed",
  "message": "Please check your input and try again",
  "errors": [
    {
      "field": "unknownField",
      "message": "Unknown field 'unknownField' is not allowed",
      "value": "..."
    }
  ]
}
```

## Security Benefits

### Before
- ❌ No validation on most routes
- ❌ Unknown fields silently accepted
- ❌ No max length enforcement
- ❌ Inconsistent error responses
- ❌ Potential for injection attacks
- ❌ DoS vulnerability from large inputs

### After
- ✅ All POST/PUT/PATCH routes validated
- ✅ Unknown fields rejected
- ✅ Max lengths enforced (prevents DoS)
- ✅ Standardized error responses
- ✅ Input sanitization (trimming, normalization)
- ✅ Type validation prevents type confusion attacks

## Implementation Details

### Middleware Order
1. `authenticateToken` - Authentication first
2. `requirePermission` - Authorization check
3. `validateRequest` - Input validation
4. `validateOwnership` - Ownership check (if applicable)
5. Route handler

### Error Logging
All validation errors are logged with:
- Request path and method
- User ID and role
- Validation error details

### Performance
- Validation happens before database queries
- Fails fast on invalid input
- Prevents unnecessary processing

## Testing

To test validation:

1. **Missing Required Fields**:
   ```bash
   POST /api/users
   Body: { "name": "Test" }
   # Should return 400 with email validation error
   ```

2. **Invalid Email**:
   ```bash
   POST /api/users
   Body: { "email": "invalid-email", "name": "Test", "role": "admin" }
   # Should return 400 with email format error
   ```

3. **Unknown Fields**:
   ```bash
   POST /api/users
   Body: { "email": "test@example.com", "name": "Test", "role": "admin", "unknownField": "value" }
   # Should return 400 with unknown field error
   ```

4. **Max Length Exceeded**:
   ```bash
   POST /api/users
   Body: { "email": "test@example.com", "name": "A".repeat(300), "role": "admin" }
   # Should return 400 with max length error
   ```

5. **Invalid ID**:
   ```bash
   PUT /api/students/invalid-id
   # Should return 400 with invalid ID format error
   ```

## Files Modified

1. ✅ `backend/middleware/validateRequest.js` - Enhanced with new features
2. ✅ `backend/server.js` - Added validation to routes

## Next Steps

Consider adding validation to:
- Other POST/PUT/PATCH routes not yet covered
- Query parameters for GET routes
- File upload routes
- Webhook endpoints
