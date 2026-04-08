# CI/CD Implementation Plan & Guide

This document outlines the GitHub Actions CI/CD pipeline integrated into the project and explains how to monitor test results.

## 1. How the CI/CD Works

The pipeline is defined in `.github/workflows/test.yml`. It triggers automatically on:
- Every `push` to `main` or `master`.
- Every `pull_request` targetting `main` or `master`.

### Pipeline Stages:
1. **Setup**: Initializes a Linux environment with Node.js 20 and a **MongoDB 6.0 service** (ensuring server tests have a database to talk to).
2. **Installation**: Cleanly installs dependencies for the Root, Server, and Client.
3. **Linting**: Checks the client code for style/error issues.
4. **Server Tests**: Runs Jest tests for API health and Socket.io logic.
5. **Client Tests**: Runs Vitest unit tests for React components.
6. **Build**: Compiles the React application into production-ready assets.
7. **Deploy (CD)**: If tests pass and it's a push to the main branch, it deploys to Vercel.

---

## 2. How to Monitor Passing and Failing Tests

### In GitHub (Cloud)
1. **The Green Check/Red Cross**: Go to the **Actions** tab in your GitHub repository.
2. **Workflow List**: You'll see a list of recent runs.
   - 🟢 **Green**: All tests passed, everything is solid.
   - 🔴 **Red**: Something failed. Click on the run to see which step (e.g., "Run Server Tests") threw an error.
3. **Logs**: Click on a failed step to see the exact error message from Jest or Vitest. This tells you *why* the test failed.

### Locally (Dev Machine)
You should always run tests locally before pushing to GitHub:
- **Run All Tests**: `npm test` from the root directory.
- **Run Server Tests only**: `npm test --prefix server`
- **Run Client Tests only**: `npm test --prefix client`

---

## 3. How to See "How it Works" (Passing vs Failing)

### Creating a Passing Test
Create a file like `server/tests/simple.test.js`:
```javascript
test('math works', () => {
    expect(1 + 1).toBe(2);
});
```
*When you push this, GitHub will show a green check for this test.*

### Creating a Failing Test (to see the error)
Change the test to:
```javascript
test('math is broken', () => {
    expect(1 + 1).toBe(3);
});
```
*When you push this, the GitHub Action will stop, show a red cross, and the logs will highlight exactly where the expectation `2` did not match `3`.*

---

## 4. Setup for Deployment (CD)
To enable the "CD" part, you need to add the following **Secrets** to your GitHub Repository (Settings -> Secrets and variables -> Actions):
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
---

## 5. Frequently Asked Questions (FAQ)

### Why is my code deploying to Vercel even if GitHub Actions fails?
By default, Vercel connects directly to your repository and triggers a deployment whenever you push code. It operates independently of GitHub Actions. 
- **GitHub Actions**: Runs your tests and security checks.
- **Vercel**: Builds and hosts your application.

Even if a test fails in GitHub Actions (Red X), Vercel might still successfully build the app (Green Check in Vercel) if there are no syntax errors. To prevent Vercel from deploying failing code, you can configure "Required Status Checks" in your GitHub repository setttings.

### How do I fix "MongoNotConnectedError" in CI?
This happens if a test finishes and tries to save data while the database connection is closing. We have added `mongoose.connection.readyState` checks to prevent this.
