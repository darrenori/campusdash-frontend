# CampusDash Frontend

## Tech Stack

- **Framework:** Vue 3 (Composition API)
- **Build Tool:** Vite
- **State Management:** Pinia
- **Routing:** Vue Router v5
- **UI Components:** PrimeVue

## Setup

### Prerequisites

- Ensure that Node.js is installed (v24.15.0 recommended)
- Create a .env file in the root directory:

```
VITE_BACKEND_URL=http://localhost:8080/api
```

**Important:** The domain string in the browser address bar must match the backend API target domain string (e.g., both must use `localhost` or both must use your local network IP configuration) to prevent the browser from blocking cross-origin HTTP-only session cookies.

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

The application will be typically accessible at `http://localhost:5173`.

Or if you are testing with a different device on the same network:

```
npm run dev -- --host
```

The application will then need to be accessed at `http://<IP_ADDRESS>:5173`.

## Core Architecture

### Views Available (`src/views/`)

- `Dashboard.vue` (`/`): The core interface for authenticated users. Requires an active session.
- `LoginView.vue` (`/login`): The login page for unauthenticated users. 
- `RegisterView.vue` (`/register`): Account creation page for new users.
- `ForgotPasswordView.vue` (`/forgot-password`): Page for resetting passwords. Contains 3 steps (Input Email, Input OTP, Input New Password).
- `ProfileView.vue` (`/profile`): Profile page for toggling Dark/Light mode and editing user information.
- `RequestView.vue` (`/request`): Form for requesting orders.

### Components Available (`src/components/`)

- `BottomNav.vue`: The navigation menu found at the bottom of the screen. Used by `DashboardView.vue`.
- `EditProfile.vue`: The form for editing user profile information. Used by `ProfileView.vue`.
- `EditPayNow.vue`: The modal for uploading PayNow QR codes. Used by `ProfileView.vue`.
- `ListView.vue`: The interface displayed listing all active orders in a list form. Used by `DashboardView.vue`.
- `MapView.vue`: The interface displayed listing all active orders in a map form. Used by `DashboardView.vue`. (NOT YET IMPLEMENTED)
- `DeliveryRequestCard.vue`: The actual individual list component displayed on `ListView.vue`.

### Router (`src/router/index.js`)

The routing layer implements authentication utilising route metadata attributes (`meta: { requiresAuth: true/false }`)

- **Session Rehydration:** The `beforeEach` navigation guard checks the backend (`GET /auth/me`) using an initialisation flag (`hasCheckedAuth`). If a valid HTTP-only cookie exists, users will remain authenticated and be allowed to traverse all authenticated routes.

### Stores (`src/stores/`)

The following lists the Pinia stores available:

- **`auth.js`:** Handles authentication using the following functions:
  - **`setLoggedIn(user)`:** Initialises memory states upon login or rehydration.
  - **logout():** Clears the local state.
- **`theme.js`:** Handles Light/Dark mode theming using the following functions:
  - **`initTheme()`:** Reads the saved theme preferences from `LocalStorage`.
  - **`toggleTheme()`:** Switches between Light mode and Dark mode (default).
- **`requests.js`:** Stores the active request state using the following functions:
  - **`setActiveRequest(req)`**: Sets an active request in the store.
  - **`clearActiveRequest()`**: Clears any active request in the store.

### Utilities (`src/utils/`)

The following utilities are available:

- `api.js`: Handles API calls to the backend server stated in the `.env` file under the property `VITE_BACKEND_URL`. Implements the following methods:
  - `get(endpoint)`: Sends a `GET` request to the endpoint, and returns the response JSON object.
  - `post(endpoint, data)`: Sends a `POST` request to the endpoint with JSON `data`, and returns the response JSON object.
  - `async patch(endpoint, data)`: Sends a `PATCH` request to the endpoint with JSON `data`, and returns the response JSON object.
  - `postFormData(endpoint, formData)`: Sends a `POST` request to the endpoint with a FormData object, and returns the response JSON object.
  - `put(endpoint, data, config)`: Sends a PUT request to the endpoint with JSON data, optionally accepts a config object to toggle auto-logout, and returns the response JSON object.
- `socket.js`: Handles socket connections to the backend server stated in the `.env` file under the property `VITE_BACKEND_URL`. The WebSocket URL is resolved by stripping the `/api` path from the environment variable. Implements the following methods:
  - `getSocket()`: Returns a Socket.io instance.


### Testing

The application's testing suite is built using **Jest** and **Vue Test Utils**, focusing on isolated unit testing and component integration. Mocks are heavily utilized for routing (`vue-router`), state management (`pinia`), and network requests (`fetch`) to ensure tests run reliably without side effects.

Tests can be run with the following command:

```
npm test
```

#### Test Coverage Summary

- **Stores (`src/stores/`)**
  - **Auth Store:** Verifies authentication state transitions, `localStorage` hydration/clearing, session logouts, and integer edge-cases for user point adjustments.
  - **Theme Store:** Ensures proper toggling of light/dark modes, `data-theme` DOM attribute updates, and `localStorage` persistence.
  - **Request Store:** Validates the tracking, replacing, and clearing of active order requests.

- **Utilities (`src/utils/`)**
  - **API Utility:** Tests standard REST methods (GET, POST, PATCH, PUT, postFormData).

- **Components (`src/components/`)**
  - **DeliveryRequestCard:** Validates UI rendering based on request conditions.

- **Views (`src/views/`)**
  - **Authentication (Login/Register):** Tests form validation constraints (e.g., password matching, username length limits), loading state UI changes, toast notification triggers, and successful router redirections upon mock API fulfillment.
  - **Forgot Password:** Validates the 3-step flow (Email -> OTP -> New Password), ensuring the submit buttons remain locked until conditions are met.
  - **Request View:** Tests validation logic and the multi-step UI state (Finding Runner -> Runner Found -> Delivery Accepted).

#### Additional Notes

- The `api.js` utility's functions come with a **401 Interceptor** which will redirect users back to the `/login` route. This assumes that the user's session has expired or is invalid.
- The `api.js` utility's functions include `credentials: 'include'` as part of its request options. This is mandatory to pass cross-origin HTTP-only session cookies.
- The `PUT` request handler in `api.js` accepts a `{ autoLogout: Boolean }` parameter to control whether the user should be logged out upon receiving a 401 error code. This is required as an incorrect current password on the `EditProfile.vue` form results in a 401 error, which does not necessitate the logging out of the user.
- The `socket.js` utility includes `withCredentials: true` during initialisation. Similar to the API utility, this ensures that cross-origin HTTP-only session cookies are passed during the initial WebSocket handshake.