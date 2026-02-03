# ValuQuick App Audit Plan

## Overview
Complete audit checklist for ValuQuick - a property valuation report generator with subscription-based pricing and per-seat team management.

---

## 1. Authentication & Authorization

### Google Sign-In
- [ ] Sign in with Google works
- [ ] Sign out works
- [ ] User document created in Firestore on first sign-in
- [ ] Session persists on page refresh
- [ ] Redirect to landing page when not authenticated
- [ ] Redirect to dashboard when authenticated

### Authorization
- [ ] Protected routes require authentication
- [ ] Users can only access their own firm's data
- [ ] Firm owner has elevated permissions
- [ ] Admin/member role permissions enforced

---

## 2. Trial System

### Trial Limits
- [ ] New users get 5 free reports
- [ ] Trial count decrements after report generation
- [ ] Trial banner shows remaining reports
- [ ] Blocked when trial exhausted

### Anti-Abuse (Device Fingerprinting)
- [ ] Device fingerprint generated correctly
- [ ] Same device, different Google account = blocked after limit
- [ ] Device linked to max 3 Google accounts
- [ ] `DEVICE_LIMIT_REACHED` error shown appropriately
- [ ] `USER_LIMIT_REACHED` error shown appropriately
- [ ] `SUSPICIOUS_ACTIVITY` error shown appropriately

---

## 3. Subscription & Payment

### Pricing Page
- [ ] All 3 plans displayed (Monthly, 6-Month, Yearly)
- [ ] Prices correct (₹1,000 / ₹5,000 / ₹9,000)
- [ ] Savings badges shown correctly
- [ ] "1 Team Member Included" displayed
- [ ] Per-seat pricing shown (₹400 / ₹2,000 / ₹3,600)

### Razorpay Checkout
- [ ] Checkout modal opens
- [ ] Plan details shown correctly
- [ ] Payment completes successfully (test with Razorpay test mode)
- [ ] Checkout can be dismissed
- [ ] Error handling for failed payments

### Subscription Creation
- [ ] `/api/create-order` creates Razorpay subscription
- [ ] `notes.app = 'valuquick'` included (for webhook isolation)
- [ ] Subscription ID returned to frontend

### Payment Verification
- [ ] `/api/verify-payment` verifies signature correctly
- [ ] Subscription created in Firestore
- [ ] `currentPeriodEnd` calculated correctly:
  - Monthly: +1 month
  - Half-yearly: +6 months
  - Yearly: +1 year
- [ ] Status set to `active`

### Subscription Status
- [ ] `isSubscribed` true when active
- [ ] `isSubscribed` false when expired (even if status = active)
- [ ] 1-day grace period for webhook delays
- [ ] Unlimited reports for subscribed users

### Webhooks
- [ ] Webhook endpoint receives events
- [ ] Signature verification works
- [ ] Non-ValuQuick events ignored (Electro Ninjas safe)
- [ ] `subscription.charged` updates `currentPeriodEnd`
- [ ] `subscription.activated` handled
- [ ] `subscription.cancelled` sets status to `cancelled`
- [ ] `subscription.halted` sets status to `past_due`
- [ ] `payment.failed` sets status to `past_due`

---

## 4. Per-Seat Pricing

### Seat Display
- [ ] SeatManagement component shows current usage
- [ ] Progress bar accurate
- [ ] Team members listed
- [ ] Pending invites listed (count toward seats)

### Add Seats
- [ ] AddSeatsModal opens
- [ ] Seat counter works (+/-)
- [ ] `/api/seats/calculate` returns correct pro-rated amount
- [ ] Pro-rated breakdown displayed
- [ ] Recurring amount displayed
- [ ] `/api/seats/purchase` creates Razorpay order
- [ ] Payment completes
- [ ] `/api/seats/verify` verifies and creates seats subscription
- [ ] Firestore updated with new seat count
- [ ] Can now invite more members

### Reduce Seats
- [ ] ReduceSeatsModal opens
- [ ] Cannot reduce below current member count
- [ ] `/api/seats/reduce` schedules reduction
- [ ] `pendingReduction` stored in Firestore
- [ ] Warning shown about pending reduction
- [ ] Can cancel pending reduction
- [ ] Reduction applied at next renewal (webhook)

### Seat Limits
- [ ] Cannot invite beyond seat limit
- [ ] `SEAT_LIMIT_REACHED` error shown
- [ ] Pending invites count toward limit
- [ ] Accept invite fails if seats full (race condition handled)

### Seats Subscription Webhook
- [ ] Seats subscription charged updates `seatsCurrentPeriodEnd`
- [ ] Pending reduction applied at renewal
- [ ] Seats subscription cancelled when reduced to 0

---

## 5. Firm & Team Management

### Create Firm
- [ ] Firm created successfully
- [ ] Owner added as member
- [ ] User's `firmId` updated

### Invite Members
- [ ] Invite created with correct role
- [ ] Invite expires after 7 days
- [ ] Email normalized to lowercase
- [ ] Duplicate invite prevented
- [ ] Seat limit checked before creating invite

### Accept Invite
- [ ] User added as member
- [ ] Invite status updated to `accepted`
- [ ] User's `firmId` updated
- [ ] Seat limit checked before accepting

### Manage Members
- [ ] Members listed correctly
- [ ] Owner cannot be removed
- [ ] Roles can be updated
- [ ] Member removal works
- [ ] Removed member's `firmId` cleared

### Pending Invites
- [ ] Pending invites displayed
- [ ] Expired invites filtered out
- [ ] Can delete pending invite

---

## 6. Report Generation

### Create Report
- [ ] Report created in Firestore
- [ ] Default form data populated
- [ ] Report ID returned

### Edit Report
- [ ] Form data loads correctly
- [ ] All fields editable
- [ ] Auto-save works
- [ ] Images upload correctly
- [ ] Image compression works

### Generate PDF
- [ ] PDF generation works
- [ ] All data included in PDF
- [ ] Images included
- [ ] Calculations correct
- [ ] PDF downloads successfully

### Report Limits
- [ ] Trial users limited to 5 reports
- [ ] Subscribed users unlimited
- [ ] Trial usage recorded after generation

---

## 7. Security

### API Security
- [ ] All API routes validate input
- [ ] Razorpay signatures verified
- [ ] Firebase Admin SDK used server-side only
- [ ] No secrets exposed to client

### Firestore Security Rules
- [ ] Users can only read/write their own data
- [ ] Firm data accessible only to members
- [ ] Subscriptions readable by firm members
- [ ] Reports scoped to firm

### Environment Variables
- [ ] All secrets in `.env.local`
- [ ] `NEXT_PUBLIC_` prefix only for public vars
- [ ] No secrets in client-side code

### Input Validation
- [ ] API endpoints validate required fields
- [ ] Type checking on inputs
- [ ] SQL/NoSQL injection prevented (Firestore safe by default)
- [ ] XSS prevented (React safe by default)

---

## 8. Error Handling

### API Errors
- [ ] Appropriate HTTP status codes
- [ ] Error messages returned to client
- [ ] Errors logged server-side
- [ ] No stack traces exposed

### UI Errors
- [ ] Error messages displayed to user
- [ ] Form validation errors shown
- [ ] Network errors handled gracefully
- [ ] Loading states shown

---

## 9. Performance

### Loading States
- [ ] Skeleton loaders or spinners shown
- [ ] No layout shifts during load
- [ ] Buttons disabled during async operations

### Image Optimization
- [ ] Images compressed before upload
- [ ] Appropriate image formats used
- [ ] Lazy loading where appropriate

### Bundle Size
- [ ] No unnecessary dependencies
- [ ] Code splitting working
- [ ] Dynamic imports for heavy components

---

## 10. UI/UX (50+ Audience)

### Accessibility
- [ ] Large text (min 18px body)
- [ ] High contrast colors
- [ ] Big, obvious buttons
- [ ] Simple navigation

### Mobile Responsive
- [ ] Works on mobile devices
- [ ] Touch-friendly buttons
- [ ] No horizontal scroll
- [ ] Forms usable on mobile

### User Feedback
- [ ] Success messages shown
- [ ] Error messages clear
- [ ] Loading indicators present
- [ ] Confirmation dialogs for destructive actions

---

## 11. Deployment

### Environment Variables (Railway)
- [ ] All Firebase vars set
- [ ] All Razorpay vars set
- [ ] Webhook secret set
- [ ] All plan IDs set

### Build
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] No build warnings (or acceptable)

### Webhook URL
- [ ] Webhook URL updated when domain changes
- [ ] Webhook receiving events (check Razorpay logs)

---

## 12. Testing Checklist

### Happy Path - New User
1. [ ] Visit landing page
2. [ ] Sign in with Google
3. [ ] See trial status (5 reports)
4. [ ] Create a firm
5. [ ] Generate a report
6. [ ] Trial count decreases
7. [ ] Generate 4 more reports
8. [ ] See upgrade prompt

### Happy Path - Subscribe
1. [ ] Click on pricing plan
2. [ ] Complete Razorpay payment
3. [ ] Subscription active
4. [ ] Unlimited reports available

### Happy Path - Add Team Member
1. [ ] Go to team settings
2. [ ] Invite a member
3. [ ] Accept invite (different browser/account)
4. [ ] Member can access firm reports

### Happy Path - Add Seats
1. [ ] Click "Add Seats"
2. [ ] Select number of seats
3. [ ] Pay pro-rated amount
4. [ ] Seats increased
5. [ ] Can now invite more members

### Edge Cases
- [ ] Expired subscription blocks report creation
- [ ] Cancelled subscription shows expiry info
- [ ] Payment failure sets `past_due` status
- [ ] Webhook processes renewal correctly
- [ ] Seat reduction at renewal works

---

## 13. Environment Parity

### Local vs Production
- [ ] Same Firebase project or separate?
- [ ] Test mode vs Live mode Razorpay?
- [ ] Webhook URL for local testing?

### Recommended Setup
- **Development**: Razorpay test mode, local Firebase emulator (optional)
- **Production**: Razorpay live mode, production Firebase

---

## Summary

| Category | Items |
|----------|-------|
| Auth | 7 |
| Trial | 9 |
| Subscription | 22 |
| Per-Seat | 17 |
| Firm/Team | 14 |
| Reports | 9 |
| Security | 12 |
| Error Handling | 8 |
| Performance | 7 |
| UI/UX | 10 |
| Deployment | 6 |
| Testing | 20+ |

**Total: ~140+ audit items**

---

## Next Steps

1. Run through each section
2. Mark items as passed/failed
3. Fix any failures
4. Re-test until all pass
5. Deploy with confidence
