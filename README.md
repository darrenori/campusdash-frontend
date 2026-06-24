# CampusDash Frontend

## Tech Stack

- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **State Management:** Pinia
- **Routing:** Vue Router v5
- **UI Components:** PrimeVue
- **Maps:** vue3-google-map / Google Maps JavaScript API
- **Real-Time Communications:** Socket.io Client

## Setup

### Prerequisites

- Ensure that Node.js is installed (v24.15.0 recommended)
- Create a .env file in the root directory

A sample of the required environment variables can be found in the `sample.env` file.

**Notes:** For the `VITE_GOOGLE_MAPS_MAP_ID` environment variable, you may choose to leave it as `DEMO_MAP_ID`. This environment variable exists only to enable advanced markers as stated on https://developers.google.com/maps/documentation/javascript/map-ids/mapid-over.

**Important:** To prevent the browser from blocking cross-origin HttpOnly session cookies during local testing, your frontend and backend domains must match. If you access the frontend via `https://localhost:5173`, your `.env` URLs must also use `localhost`. Note that HTTPS is used instead of HTTP.

### Installation

Install the project dependencies

```
npm install
```

### Run the Development Server

Launch the local Vite compilation server:

```
npm run dev
```

The application will be typically accessible at `https://localhost:5173`.

Or if you are testing with a different device on the same network:

```
npm run dev -- --host
```

The application will then need to be accessed at `https://<IP_ADDRESS>:5173`.

### Deployment Notes

- `vite.config.js` proxies `/api`, `/uploads`, and `/socket.io` to `VITE_BACKEND_PROXY_URL` during development.
- In production, `VITE_BACKEND_URL` defaults to `/api` when a relative API path is required.
- `VITE_FILE_SERVER_URL` is used to resolve relative upload paths returned by the backend.
- `vercel.json` and `public/404.html` support SPA routing during deployment.
- `GITHUB_PAGES_BASE` may be used to override the Vite base path.

## Core Architecture

### Views Available (`src/views/`)

- `DashboardView.vue` (`/`): The core authenticated interface. Displays the map/list discovery toggle, active order drawer, live request updates, presence, and chat entry points.
- `ListView.vue`: The interface displaying all active orders in a list form. Used by `DashboardView.vue`.
- `MapView.vue`: The Google Maps interface displaying open request markers, pickup/dropoff markers, buyer/runner live locations, and runner walking routes. Used by `DashboardView.vue`
- `LoginView.vue` (`/login`): The login page for unauthenticated users.
- `RegisterView.vue` (`/register`): Account creation page for new users.
- `ForgotPasswordView.vue` (`/forgot-password`): Page for resetting passwords. Contains 3 steps (Input Email, Input OTP, Input New Password).
- `ProfileView.vue` (`/profile`): Profile page for toggling Dark/Light mode, editing user information, Profile Picture, PayNow QR code, and selecting displayed badges.
- `RequestView.vue` (`/request`): Form for requesting orders.
- `HistoryView.vue` (`/history`): Order history page with active orders, past orders, requester/runner filters, and pagination.
- `MessagesView.vue` (`/messages`): Messaging interface with conversation list, active chat threads, unread counts, typing indicators, image messages, and linked order actions.

### Components Available (`src/components/`)

- `BottomNav.vue`: The navigation menu found at the bottom of the screen. Displays Discover (Dashboard), History, Points, Messages (with unread indicator), and Profile.
- `ActivityWidget.vue`: NOT IN USE.
- `AchievementToastListener.vue`: Listens for `achievements:unlocked` socket events and displays PrimeVue toast notifications.
- `CancelPanel.vue`: Collects and validates cancellation reasons for accepted orders.
- `DeliveryRequestCard.vue`: The actual individual list component displayed on `ListView.vue`.
- `DeliveryRequestDrawer.vue`: The order detail drawer used by the dashboard map/list views. Handles accept, cancel, collected, complete, and chat actions.
- `EditProfile.vue`: The form for editing user profile information. Used by `ProfileView.vue`.
- `EditPayNow.vue`: The modal for uploading PayNow QR codes. Used by `ProfileView.vue`.
- `UserProfileDialog.vue`: Displays public user profile information and displayed badges.
- `messages/ConversationList.vue`: Lists conversations, unread state, last messages, and online status.
- `messages/ConversationView.vue`: Displays a selected conversation with timeline order segments.
- `messages/MessageBubble.vue`: Renders text and image messages.
- `messages/MessageComposer.vue`: Sends text, typing events, and image uploads.
- `messages/OrderDetailsSheet.vue`: Displays linked order details inside the chat flow.

### Router (`src/router/index.js`)

The routing layer implements authentication utilising route metadata attributes (`meta: { requiresAuth: true/false }`)

- **Session Rehydration:** The `beforeEach` navigation guard checks the backend (`GET /auth/me`) using an initialisation flag (`hasCheckedAuth`). If a valid HTTP-only cookie exists, users will remain authenticated and be allowed to traverse all authenticated routes.
- **Protected Routes:** `/`, `/request`, `/history`, `/messages`, and `/profile` require an active session.
- **Public Routes:** `/login`, `/register`, and `/forgot-password` redirect authenticated users back to `/`.
- **Catchall Routes:** `/discover` and unknown routes redirect to `/`.

### Stores (`src/stores/`)

The following lists the Pinia stores available:

- **`auth.js`:** Handles authentication using the following functions:
  - **`setLoggedIn(user)`:** Initialises memory states upon login or rehydration.
  - **`logout()`:** Clears the local state, removes cached user data, disconnects sockets, and returns the user to `/login`.
  - **`adjustPoints(delta)`:** Updates the cached points value.
  - **`setPoints(points)`:** Replaces the cached points value after backend-confirmed order actions.
  - **`incrementDeliveries()`:** Updates the cached delivery count after a completed delivery.
- **`theme.js`:** Handles Light/Dark mode theming using the following functions:
  - **`initTheme()`:** Reads the saved theme preferences from `LocalStorage`.
  - **`toggleTheme()`:** Switches between Light mode and Dark mode (default).
- **`requests.js`:** Stores the active request state using the following functions:
  - **`setActiveRequest(req)`**: Sets an active request in the store.
  - **`clearActiveRequest()`**: Clears any active request in the store.
- **`messages.js`:** Handles inbox state, socket subscriptions, conversation threads, unread counts, typing indicators, image uploads, and linked order actions using the following functions:
  - **`init()` / `teardown()` / `reset()`:** Binds and clears socket listeners.
  - **`loadConversations()` / `loadMessages()` / `loadOlder()`**: Loads inbox and paginated messages.
  - **`openConversation(id)` / `closeConversation()`**: Joins and leaves conversation rooms.
  - **`sendMessage(id, body)` / `sendImage(id, file, caption)`**: Sends text and image messages.
  - **`markRead(id)` / `sendTyping(id)` / `sendStopTyping(id)`**: Sends read receipts and typing events.
  - **`startConversation(userId, requestId)` / `deleteConversation(id)`**: Creates or clears conversations.
  - **`completeOrder(id, orderId)` / `markPickedUp(id, orderId)`**: Performs linked order actions from chat.

### Utilities (`src/utils/`)

The following utilities are available:

- `api.js`: Handles API calls to the backend server stated in the `.env` file under the property `VITE_BACKEND_URL`. Implements the following methods:
  - `get(endpoint)`: Sends a `GET` request to the endpoint, and returns the response JSON object.
  - `post(endpoint, data)`: Sends a `POST` request to the endpoint with JSON `data`, and returns the response JSON object.
  - `patch(endpoint, data)`: Sends a `PATCH` request to the endpoint with JSON `data`, and returns the response JSON object.
  - `postFormData(endpoint, formData)`: Sends a `POST` request to the endpoint with a FormData object, and returns the response JSON object.
  - `delete(endpoint)`: Sends a `DELETE` request to the endpoint, and returns the response JSON object.
  - `put(endpoint, data, config)`: Sends a PUT request to the endpoint with JSON data, optionally accepts a config object to toggle auto-logout, and returns the response JSON object.
- `socket.js`: Handles socket connections to the backend server stated in the `.env` file under the property `VITE_BACKEND_URL`. The WebSocket URL is resolved by stripping the `/api` path from the environment variable. Implements the following methods:
  - `getSocket()`: Returns a Socket.io instance.
  - `disconnectSocket()`: Disconnects and clears the current Socket.io instance.
- `fileUrl.js`: Resolves relative upload paths against `VITE_FILE_SERVER_URL`, while leaving absolute URLs untouched.
- `achievementToast.js`: Displays toast notifications when badges are unlocked.

## Testing

The application's testing suite is built using **Jest** and **Vue Test Utils**, focusing on isolated unit testing and component integration. Mocks are heavily utilised for routing (`vue-router`), state management (`pinia`), sockets, and network requests (`fetch`) to ensure tests run reliably without side effects.

Tests can be run with the following command:

```
npm test
```

### Test Coverage Summary

- **Stores (`src/stores/`)**
  - **Auth Store:** Verifies authentication state transitions, `localStorage` hydration/clearing, session logouts, point adjustments, and delivery count updates.
  - **Theme Store:** Ensures proper toggling of light/dark modes, `data-theme` DOM attribute updates, and `localStorage` persistence.
  - **Request Store:** Validates the tracking, replacing, and clearing of active order requests.
  - **Messages Store:** Validates conversation state, unread counts, socket-driven events, and message lifecycle behaviour.

- **Utilities (`src/utils/`)**
  - **API Utility:** Tests standard REST methods (GET, POST, PATCH, PUT, DELETE, postFormData) and session-expiry handling.

- **Components (`src/components/`)**
  - **CancelPanel:** Validates cancellation reason constraints and UI state.
  - **DeliveryRequestCard:** Validates UI rendering based on request conditions.
  - **DeliveryRequestDrawer:** Validates order action controls and drawer state.
  - **MessageBubble / MessageComposer:** Validates message rendering, sending, typing, and image attachment interactions.

- **Views (`src/views/`)**
  - **Authentication (Login/Register):** Tests form validation constraints (e.g., password matching, username length limits), loading state UI changes, toast notification triggers, and successful router redirections.
  - **Forgot Password:** Validates the 3-step flow (Email -> OTP -> New Password), ensuring the submit buttons remain locked until conditions are met.
  - **Request View:** Tests validation logic and the multi-step UI state (Finding Runner -> Runner Found -> Delivery Accepted).
  - **Map View:** Tests Google Maps integration boundaries, marker behaviour, live location handling, and route calculation guards.

#### Additional Notes

- The `api.js` utility's functions come with a **401 Interceptor** which will redirect users back to the `/login` route. This assumes that the user's session has expired or is invalid.
- The `api.js` utility's functions include `credentials: 'include'` as part of its request options. This is mandatory to pass cross-origin HTTP-only session cookies.
- The `PUT` request handler in `api.js` accepts a `{ autoLogout: Boolean }` parameter to control whether the user should be logged out upon receiving a 401 error code. This is required as an incorrect current password on the `EditProfile.vue` form results in a 401 error, which does not necessitate the logging out of the user.
- The `socket.js` utility includes `withCredentials: true` during initialisation. Similar to the API utility, this ensures that cross-origin HTTP-only session cookies are passed during the initial WebSocket handshake.