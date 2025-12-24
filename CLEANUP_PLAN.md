# Codebase Cleanup Plan

## 🎯 Goals
1. Remove duplicate code
2. Remove unused features/components
3. Remove extra buttons
4. Optimize performance
5. Improve UI/UX consistency

## 📋 Tasks

### Phase 1: Remove Duplicate Files ✅
- [x] Remove `src/pages/StudentDashboard.tsx` (unused, replaced by module version)
- [x] Remove `src/modules/student/pages/StudentDashboardDebug.tsx` (debug file)
- [x] Remove `src/modules/student/pages/StudentMainDashboard.tsx` (duplicate)

### Phase 2: Clean Up Dashboards
- [ ] SuperAdminDashboard: Remove unused lazy imports
- [ ] AdminDashboard: Remove unused lazy imports  
- [ ] TeacherDashboard: Remove unused lazy imports
- [ ] Consolidate common dashboard components

### Phase 3: Remove Unused Components
- [ ] Identify components never imported
- [ ] Remove DebugPanel from production builds
- [ ] Remove unused utility functions

### Phase 4: Optimize Performance
- [ ] Add React.memo to expensive components
- [ ] Optimize re-renders with useMemo/useCallback
- [ ] Reduce bundle size

### Phase 5: UI/UX Improvements
- [ ] Consistent button styles
- [ ] Remove redundant buttons
- [ ] Improve navigation flow

