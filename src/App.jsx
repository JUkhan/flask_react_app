import React from 'react';
import {
  createRouter,
  createRoute,
  createRootRoute,
  Link,
  Outlet,
  RouterProvider,
  //useNavigate,
  //useParams,
  //useSearch,
  //redirect
} from '@tanstack/react-router';

import HomePage from './components/HomePage';
import CounterPage from './components/CounterPage';
import Counter2Page from './components/Counter2Page';
// Root route component
function RootComponent() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              {/* <Link 
                to="/" 
                className="text-xl font-bold text-blue-600 hover:text-blue-800"
              >
                TanStack Router Demo
              </Link> */}
              <div className="flex space-x-4">
                <Link 
                  to="/" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{ className: "text-blue-600 bg-blue-50" }}
                >
                  Home
                </Link>
                <Link 
                  to="/counter1" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{ className: "text-blue-600 bg-blue-50" }}
                >
                  Counter1
                </Link>
                <Link 
                  to="/counter2" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{ className: "text-blue-600 bg-blue-50" }}
                >
                  Counter2
                </Link>
                {/* <Link 
                  to="/posts" 
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  activeProps={{ className: "text-blue-600 bg-blue-50" }}
                >
                  Posts
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

// Define routes
const rootRoute = createRootRoute({
  component: RootComponent,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/counter1',
  component: CounterPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/counter2',
  component: Counter2Page,
});


// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  aboutRoute,
  usersRoute,
]);

// Create router
const router = createRouter({ routeTree });

// Main App component
export default function App() {
  return <RouterProvider router={router} />;
}