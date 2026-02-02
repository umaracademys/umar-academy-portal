# Permissions Page Test Checklist

## Page URL
`http://localhost:5173/permissions`

## Prerequisites
- ✅ Must be logged in as **superadmin**
- ✅ Backend server must be running
- ✅ Database must have teachers and admins

---

## 1. Page Access & Authentication ✅

### Test Cases:
- [ ] **Access Control**: Non-superadmin users should be redirected to dashboard
- [ ] **Access Control**: Superadmin can access the page
- [ ] **Loading State**: Page shows loading spinner while data loads
- [ ] **Error Handling**: Shows error message if data fails to load

### Expected Behavior:
- Page redirects non-superadmin users
- Shows "Access Denied" message for unauthorized users
- Displays loading state during data fetch

---

## 2. Page Layout & UI ✅

### Test Cases:
- [ ] **Header**: Displays "Permission Management" title
- [ ] **Description**: Shows "Control access and permissions for teachers and admins"
- [ ] **Stats Cards**: Displays three stat cards:
  - Total Teachers count
  - Total Admins count
  - Total Users count
- [ ] **Refresh Button**: Refresh button is visible and functional
- [ ] **Sidebar**: Sidebar is visible and functional
- [ ] **Header Component**: Header is visible at top

### Expected Behavior:
- All UI elements are visible and properly styled
- Stats cards show correct counts
- Refresh button shows loading state when clicked

---

## 3. Permission Manager Component ✅

### Test Cases:
- [ ] **Component Loads**: PermissionManager component loads without errors
- [ ] **Full Page Mode**: Component renders in full-page mode (not modal)
- [ ] **Header**: Shows "Permission Control" header with gradient background
- [ ] **Mode Badge**: Shows "Single Mode" or "Bulk Mode" badge
- [ ] **Close Button**: Close button is NOT visible (full-page mode)

### Expected Behavior:
- Component loads successfully
- No modal overlay
- Full page layout

---

## 4. User Selection (Single Mode) ✅

### Test Cases:
- [ ] **Role Type Selection**: Can switch between "Teacher" and "Admin" tabs
- [ ] **User Dropdown**: Dropdown shows list of teachers/admins
- [ ] **User Selection**: Can select a user from dropdown
- [ ] **User Info Display**: Selected user's information is displayed
- [ ] **Empty State**: Shows message when no user is selected

### Expected Behavior:
- Smooth switching between teacher/admin tabs
- Dropdown is searchable/filterable
- User info updates when selection changes

---

## 5. Permission Display ✅

### Test Cases:
- [ ] **Permission Groups**: Permissions are grouped by category
- [ ] **Group Expansion**: Can expand/collapse permission groups
- [ ] **Permission Toggles**: Each permission has a toggle switch
- [ ] **Permission Labels**: Permission labels are clear and descriptive
- [ ] **Permission Descriptions**: Descriptions are visible
- [ ] **Current State**: Toggles reflect current permission state

### Expected Behavior:
- Groups are collapsible
- Toggles are interactive
- Current permissions are accurately displayed

---

## 6. Permission Updates (Single User) ✅

### Test Cases:
- [ ] **Toggle Permission**: Can toggle individual permissions on/off
- [ ] **Save Button**: Save button is visible and functional
- [ ] **Loading State**: Shows loading state during save
- [ ] **Success Feedback**: Shows success message after save
- [ ] **Error Handling**: Shows error message if save fails
- [ ] **Data Refresh**: Data refreshes after successful save

### Expected Behavior:
- Permission changes are saved to database
- Success/error messages are displayed
- UI updates reflect changes

---

## 7. Bulk Mode ✅

### Test Cases:
- [ ] **Toggle Bulk Mode**: Can toggle bulk mode on/off
- [ ] **User Selection**: Can select multiple users with checkboxes
- [ ] **Select All**: "Select All" button works
- [ ] **Clear Selection**: "Clear Selection" button works
- [ ] **Selection Count**: Shows count of selected users
- [ ] **Permission Selection**: Can select permission to apply
- [ ] **Enable/Disable Buttons**: Can choose to enable or disable permission
- [ ] **Apply Button**: "Apply" button is visible and functional
- [ ] **Bulk Update**: Updates all selected users
- [ ] **Success Feedback**: Shows success message with count
- [ ] **Error Handling**: Shows errors for failed updates

### Expected Behavior:
- Bulk mode UI is clear and functional
- Multiple users can be selected
- Bulk updates work correctly
- Feedback is provided for each operation

---

## 8. Preset Permissions ✅

### Test Cases:
- [ ] **Teacher Presets**: Can apply "All", "View", or "None" presets for teachers
- [ ] **Admin Presets**: Can apply "All", "Finance Reports", or "None" presets for admins
- [ ] **Preset Application**: Presets apply correctly to selected user
- [ ] **Feedback**: Shows feedback after preset application

### Expected Behavior:
- Presets apply correct permission sets
- UI updates immediately
- Success message is shown

---

## 9. Data Refresh ✅

### Test Cases:
- [ ] **Refresh Button**: Refresh button in page header works
- [ ] **Loading State**: Shows loading state during refresh
- [ ] **Data Update**: Data updates after refresh
- [ ] **Stats Update**: Stats cards update with new counts
- [ ] **Success Feedback**: Shows success message after refresh

### Expected Behavior:
- Data is refreshed from backend
- UI updates with latest data
- No errors during refresh

---

## 10. Error Handling ✅

### Test Cases:
- [ ] **Network Errors**: Handles network errors gracefully
- [ ] **API Errors**: Shows appropriate error messages
- [ ] **Validation Errors**: Validates inputs before submission
- [ ] **Empty States**: Handles empty teacher/admin lists
- [ ] **Missing Data**: Handles missing permission data

### Expected Behavior:
- Error messages are user-friendly
- Page doesn't crash on errors
- Errors are logged to console

---

## 11. Performance ✅

### Test Cases:
- [ ] **Initial Load**: Page loads within reasonable time (< 3 seconds)
- [ ] **Permission Toggle**: Toggles respond immediately
- [ ] **Bulk Operations**: Bulk operations complete in reasonable time
- [ ] **No Flickering**: UI doesn't flicker during updates
- [ ] **Smooth Animations**: Animations are smooth

### Expected Behavior:
- Fast and responsive UI
- No performance issues
- Smooth user experience

---

## 12. Mobile Responsiveness ✅

### Test Cases:
- [ ] **Mobile Layout**: Layout adapts to mobile screens
- [ ] **Touch Interactions**: Touch interactions work correctly
- [ ] **Sidebar**: Sidebar is accessible on mobile
- [ ] **Dropdowns**: Dropdowns work on mobile
- [ ] **Buttons**: Buttons are appropriately sized for mobile

### Expected Behavior:
- Responsive design works on all screen sizes
- Mobile experience is smooth

---

## 13. Integration Tests ✅

### Test Cases:
- [ ] **Backend Connection**: Successfully connects to backend API
- [ ] **API Endpoints**: Uses correct API endpoints:
  - `PUT /api/teachers/:id` for teacher updates
  - `PUT /api/admins/:id` for admin updates
- [ ] **Token Authentication**: Sends authentication token with requests
- [ ] **Data Persistence**: Changes persist in database
- [ ] **Real-time Updates**: Changes reflect immediately in UI

### Expected Behavior:
- All API calls succeed
- Data persists correctly
- No authentication errors

---

## 14. Edge Cases ✅

### Test Cases:
- [ ] **No Users**: Handles case when no teachers/admins exist
- [ ] **Single User**: Works correctly with only one user
- [ ] **Large Lists**: Handles large lists of users efficiently
- [ ] **Concurrent Updates**: Handles multiple rapid updates
- [ ] **Invalid Data**: Handles invalid permission data gracefully

### Expected Behavior:
- Edge cases are handled gracefully
- No crashes or errors

---

## Known Issues to Check ✅

1. **Syntax Errors**: Verify no syntax errors in console
2. **TypeScript Errors**: Verify no TypeScript compilation errors
3. **Missing Dependencies**: Verify all imports are available
4. **API Compatibility**: Verify API endpoints match backend
5. **Permission Keys**: Verify permission keys match backend schema

---

## Test Results Summary

### Passed: ___ / 14
### Failed: ___ / 14
### Notes:

---

## Quick Test Script

1. Navigate to `http://localhost:5173/permissions`
2. Verify page loads (should redirect if not superadmin)
3. Check stats cards show correct counts
4. Select a teacher from dropdown
5. Toggle a permission
6. Click save
7. Verify success message
8. Switch to bulk mode
9. Select multiple users
10. Apply a permission in bulk
11. Verify success message
12. Click refresh button
13. Verify data refreshes

---

## Browser Console Checks

- ✅ No JavaScript errors
- ✅ No React warnings
- ✅ No network errors
- ✅ No authentication errors
- ✅ No TypeScript errors

---

## Backend API Checks

- ✅ `GET /api/teachers` - Returns teachers list
- ✅ `GET /api/admins` - Returns admins list
- ✅ `PUT /api/teachers/:id` - Updates teacher permissions
- ✅ `PUT /api/admins/:id` - Updates admin permissions
- ✅ All endpoints require authentication
- ✅ All endpoints return correct data format

---

**Last Updated**: 2026-01-21
**Tested By**: [Your Name]
**Status**: ⏳ Pending Testing
