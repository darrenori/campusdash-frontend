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

or if you are testing with a different device on the same network:
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

### Utilities (`src/utils/`)
The following utilities are available:
- `api.js`: Handles API calls to the backend server stated in the `.env` file under the property `VITE_BACKEND_URL`. Implements the following methods:
  - `get(endpoint)`: Sends a `GET` request to the endpoint, and returns the response JSON object.
  - `post(endpoint, data)`: Sends a `POST` request to the endpoint with JSON `data`, and returns the response JSON object.

#### Additional Notes
- The `api.js` utility's functions come with a **401 Interceptor** which will redirect users back to the `/login` route. This assumes that the user's session has expired or is invalid.
- The `api.js` utility's functions include `credentials: 'include'` as part of its request options. This is mandatory to pass cross-origin HTTP-only session cookies.