# Solution and Trade-offs

This document outlines the solutions implemented to address the issues described in the `README.md` file.

## Backend

### 1. Refactor blocking I/O

- I replaced the synchronous `fs.readFileSync` and `fs.writeFileSync` in `src/routes/items.js` with their asynchronous counterparts from `fs.promises`- prevents blocking the Node.js event loop during file operations.
- All the route handlers in `items.js` were converted to `async` functions to `await` these operations.

### 2. Performance

For the `GET /api/stats` I implemented in-memory caching. The stats are calculated once and then served from the cache for subsequent requests. To handle data changes, I used `fs.watch` to monitor `data/items.json`. When the file is modified, the cache is invalidated, and the stats are recalculated on the next request.

### 3. Testing

I added a new test file `src/routes/items.test.js` using Jest and Supertest. The tests cover:
-   **GET /api/items**: Pagination and search functionality.
-   **GET /api/items/:id**: Successful retrieval and 404 not found errors.
-   **POST /api/items**: Successful creation and payload validation for missing fields.

I also refactored the main `index.js` to export the `app` and `server` instances to allow for better testing and graceful shutdown. 
Additionally, I fixed a major security vulnerability in the `errorHandler.js` middleware, replacing it with a standard Express error handler.

## Frontend

### 1. Memory Leak

I fixed the memory leak in `Items.js` by using an `AbortController`. When the component unmounts, the `AbortController` aborts the `fetch` request, preventing the `setState` call on an unmounted component.

### 2. Pagination, Search & Sorting

I implemented server-side pagination, search & sorting. The frontend now sends `page`, `limit`, and `q` query parameters to the backend. The UI includes a search input and "Previous"/"Next" buttons to navigate through the paginated data. The `DataContext` was updated to manage pagination state. Sorting is done on the server side based on the `sortBy` and `order` query parameters.

### 3. Performance

To handle large lists efficiently, I integrated `react-window`. The item list is now rendered using `FixedSizeList`, which only renders the items visible to the user, dramatically improving UI performance and memory usage.

### 4. UI/UX Polish

I added a loading indicator that is displayed while items are being fetched. I also added a message that is shown when no items are found, improving the user experience.

## Trade-offs

-   **In-Memory Cache**: The caching solution for `/api/stats` is simple and effective for a single-server instance. In a distributed environment, a more robust solution like Redis or Memcached would be necessary to ensure cache consistency across multiple instances.
-   **File-based Database**: The application uses a JSON file as a database. This is not suitable for production environments due to potential race conditions when writing to the file and performance issues with large datasets. A proper database like PostgreSQL or MongoDB would be a better choice.
-   **Simple Search**: The search functionality is a basic case-insensitive substring match. For more advanced search capabilities, a dedicated search engine like Elasticsearch or a more powerful database query would be needed.
-   **Frontend Tests**: I added a basic test to ensure the app renders. For a production application, more comprehensive tests covering component interactions, edge cases, and different states would be necessary.
