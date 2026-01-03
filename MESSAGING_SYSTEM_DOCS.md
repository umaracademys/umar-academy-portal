# Unified Messaging System Documentation

## Overview

The Unified Messaging System is a secure, admin-monitored messaging platform that ensures all conversations are visible to administrators while maintaining privacy and preventing contact information sharing.

## Architecture

### Core Principles

1. **Admin Always Included**: Every conversation automatically includes an admin participant at the database level
2. **No Contact Information**: Server-side validation prevents sharing of emails, phone numbers, or external contact methods
3. **Immutable Messages**: Messages cannot be edited, only redacted by administrators
4. **Full Audit Trail**: All messages are logged and auditable
5. **Role-Based Access**: Server-side enforcement of permissions

### Data Models

#### Conversation Model (`backend/models/Conversation.js`)

- **Type**: `teacher_student` | `pair_teacher`
- **Participants**: Array of `{ role, userId, roleRef, name, email }` - Admin is always included
- **Context**: Additional metadata (studentId, pairId, teacherId)
- **Locked**: Boolean flag for moderation
- **Statistics**: messageCount, unreadCount, lastMessageAt

#### Message Model (`backend/models/Message.js`)

- **Conversation Reference**: Links to parent conversation
- **Sender Info**: senderRole, senderId, senderName
- **Body**: Message content (can be redacted)
- **Attachments**: Array of file references
- **Read Receipts**: Tracked per role/user
- **Priority**: low | normal | high | urgent
- **System Flag**: For admin-generated messages

### API Endpoints

All endpoints are prefixed with `/api/conversations`

#### Conversation Management

- `GET /conversations` - List conversations (paginated, filtered by type)
- `POST /conversations` - Create new conversation

#### Message Operations

- `GET /conversations/:id/messages` - Get messages (paginated)
- `POST /conversations/:id/messages` - Send message
- `PUT /conversations/:id/messages/:messageId/read` - Mark as read
- `PUT /conversations/:id/messages/mark-read` - Bulk mark as read
- `POST /conversations/:id/messages/upload` - Upload attachment

#### Admin Moderation

- `PUT /conversations/:id/lock` - Lock conversation
- `PUT /conversations/:id/unlock` - Unlock conversation
- `PUT /conversations/:id/messages/:messageId/redact` - Redact message
- `POST /conversations/:id/messages/system` - Send system message
- `GET /conversations/admin/stats` - Get admin statistics

### Security & Validation

#### Contact Information Detection (`backend/middleware/messageValidation.js`)

The system detects and blocks:
- Email addresses (except @umaracademy.org)
- Phone numbers
- WhatsApp references
- Telegram references
- Video call links (Zoom, Skype, Google Meet, Teams)
- Social media handles
- Suspicious URLs

#### File Validation

- Allowed types: Images, PDFs, Documents, Audio, Video
- Blocked: Executables, installers, system files
- Max size: 10MB per file

#### Rate Limiting

- 10 messages per minute per user
- Prevents spam and abuse

### Frontend Components

#### UnifiedMessagesPage (`src/components/UnifiedMessagesPage.tsx`)

Main messaging interface with:
- Role-based conversation filtering
- Search functionality
- Conversation cards with unread counts
- Create conversation button (for authorized users)

#### UnifiedChatView (`src/components/UnifiedChatView.tsx`)

Chat interface featuring:
- Real-time message display
- File attachment support
- Admin monitoring banner
- Lock status indicator
- Auto-refresh every 30 seconds
- Read receipts

### Migration

To migrate existing messages to the new unified schema:

```bash
node backend/scripts/migrateMessages.js
```

This script:
1. Migrates TeacherStudentMessage → Conversation + Message
2. Migrates PairTeacherMessage → Conversation + Message
3. Preserves all metadata (timestamps, read status, attachments)
4. Automatically includes admin in all conversations

### Usage Examples

#### Creating a Teacher-Student Conversation

```javascript
POST /api/conversations
{
  "type": "teacher_student",
  "participants": [
    { "role": "teacher", "userId": "..." },
    { "role": "student", "userId": "..." }
  ],
  "context": {
    "studentId": "...",
    "teacherId": "..."
  }
}
```

#### Sending a Message

```javascript
POST /api/conversations/:conversationId/messages
{
  "body": "Hello, how can I help you?",
  "attachments": [],
  "priority": "normal"
}
```

#### Admin Redacting a Message

```javascript
PUT /api/conversations/:conversationId/messages/:messageId/redact
{
  "reason": "Contains prohibited content"
}
```

### Permissions

- **Teachers**: Can create conversations with their students, send/receive messages
- **Students**: Can send/receive messages in their conversations
- **Admins**: Full access - view all, moderate, lock, redact, send system messages

### Best Practices

1. **Always validate on server**: Never rely on frontend validation alone
2. **Monitor conversations**: Use admin stats endpoint to track activity
3. **Lock abusive conversations**: Use lock feature for problematic conversations
4. **Redact carefully**: Redaction preserves audit trail but hides content
5. **Use system messages**: For official announcements or warnings

### Troubleshooting

#### Admin Not Found Error

If you see "Admin user not found" errors:
1. Ensure a superadmin or admin user exists in the database
2. Check user role field is set correctly
3. Run migration script to verify admin user

#### Messages Not Appearing

1. Check conversation participants include admin
2. Verify user has access to conversation
3. Check conversation is not locked
4. Verify message validation passed

#### File Upload Fails

1. Check file size (max 10MB)
2. Verify file type is allowed
3. Check uploads/messages directory exists
4. Verify CORS configuration

### Future Enhancements

- [ ] Message reactions/emojis
- [ ] Message forwarding
- [ ] Conversation archiving
- [ ] Advanced search
- [ ] Message templates
- [ ] Notification system integration
- [ ] Export conversation history

