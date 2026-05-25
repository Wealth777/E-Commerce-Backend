
## Notification System Update

### Stack confirmed

The backend currently uses Node.js, Express, MongoDB, Mongoose, JWT authentication, bcrypt, Cloudinary, nodemailer, Swagger, express-rate-limit, and a structured logger. Socket.io was added for real-time in-app notifications.

### Files created

- `models/notification.model.js`
  - Stores all buyer and vendor notifications.
  - Tracks in-app, email, and WhatsApp channel state.
  - Supports read state per channel.
  - Supports soft delete for in-app notifications only.
  - Uses `dedupeKey` to prevent duplicate notifications.

- `services/notification/notification.service.js`
  - Central reusable notification service.
  - Always creates in-app notifications.
  - Reads `notificationPreference` from the recipient profile.
  - Sends WhatsApp, email, or both based on user preference.
  - Emits Socket.io events for real-time updates.
  - Provides notification list, unread count, mark-read, mark-all-read, and delete logic.

- `services/messaging/email.service.js`
  - Placeholder email notification service.
  - Ready to connect to nodemailer or a production provider.

- `services/messaging/whatsapp.service.js`
  - Placeholder WhatsApp notification service.
  - Ready to connect to WhatsApp Business Cloud API, Termii, Twilio, or another provider.

- `controllers/common/notification.controller.js`
  - API handlers for notification actions.

- `routes/notification.route.js`
  - Notification routes protected by existing JWT middleware.
  - Restricted to buyer and vendor users only.

- `sockets/notification.socket.js`
  - Socket.io JWT authentication.
  - Joins each logged-in user to a private room.
  - Emits new notifications and unread count updates.

### Files modified

- `package.json`
  - Added `socket.io` dependency.

- `index.js`
  - Replaced direct `app.listen` with an HTTP server.
  - Added Socket.io server initialization.

- `app.js`
  - Added `/api/notifications` route.

- `models/buyer.model.js`
  - Added `profileUpdateNotificationSent` to prevent duplicate profile update notifications.

- `models/vendor.model.js`
  - Added `profileUpdateNotificationSent` to prevent duplicate profile update notifications.

- `controllers/Buyer/auth.controller.js`
  - Sends profile update notification on first buyer login.

- `controllers/Vendor/auth.controller.js`
  - Sends profile update notification on first vendor login.
  - Corrected profile notification preference handling to use `notificationPreference`.

- `controllers/Buyer/order.controller.js`
  - Sends buyer order placed notification.
  - Sends vendor new order notification.
  - Sends vendor delivery confirmed notification.
  - Sends vendor order cancelled notification.
  - Sends vendor refund request notification.
  - Sends vendor return request notification.

- `controllers/Vendor/order.controller.js`
  - Sends buyer order confirmed notification.
  - Sends buyer order shipped notification.
  - Sends buyer refund status update notifications.
  - Sends buyer return status update notifications.
  - Sends vendor low stock notifications after stock reduction.

### API endpoints added

Base route: `/api/notifications`

- `GET /api/notifications`
  - Gets logged-in buyer or vendor notifications.
  - Query params: `page`, `limit`.

- `GET /api/notifications/unread-count`
  - Gets logged-in buyer or vendor unread in-app count.

- `PATCH /api/notifications/:notificationId/read`
  - Marks one notification as read.
  - Body: `{ "channel": "inApp" }`
  - Supported channels: `inApp`, `email`, `whatsapp`.

- `PATCH /api/notifications/read-all`
  - Marks all notifications as read for one channel.
  - Body: `{ "channel": "inApp" }`

- `DELETE /api/notifications/:notificationId`
  - Soft deletes an in-app notification.
  - Email and WhatsApp notifications are not deleted.

### Socket events

Client connects with JWT:

```js
const socket = io(API_URL, {
  auth: { token: accessToken }
});
```

Events emitted by server:

- `notification:new`
  - Payload: full notification document.

- `notification:unread-count`
  - Payload: `{ count }`.

Private socket room format:

- `buyer:<buyerId>`
- `vendor:<vendorId>`

### Notification flow

1. A business action happens.
2. Controller commits the database transaction.
3. Notification service creates an in-app notification.
4. Service checks recipient `notificationPreference`.
5. If preference is `whatsapp`, WhatsApp placeholder service runs.
6. If preference is `email`, email placeholder service runs.
7. If preference is `both`, both services run.
8. Socket.io emits `notification:new` to the owner only.
9. Socket.io emits the updated unread count.

### How to test

1. Install dependencies:

```bash
npm install
```

2. Start the backend:

```bash
npm run dev
```

If no dev script exists, run:

```bash
node index.js
```

3. Register and log in as buyer.
   - The first login creates a profile update notification.

4. Register and log in as vendor.
   - The first login creates a profile update notification.

5. Create an order as buyer.
   - Buyer gets order placed notification.
   - Vendor gets new order notification.

6. Confirm payment and confirm order as vendor.
   - Buyer gets order confirmed notification.
   - Vendor gets low stock notification if product stock is 5 or less.

7. Ship order as vendor.
   - Buyer gets order shipped notification.

8. Confirm delivery as buyer.
   - Vendor gets delivery confirmed notification.

9. Request refund or return as buyer.
   - Vendor gets request notification.

10. Review refund or return as vendor.
    - Buyer gets status update notification.

11. Test APIs:

```bash
GET /api/notifications
GET /api/notifications/unread-count
PATCH /api/notifications/:notificationId/read
PATCH /api/notifications/read-all
DELETE /api/notifications/:notificationId
```

Use the same Bearer token format already used by the backend.
