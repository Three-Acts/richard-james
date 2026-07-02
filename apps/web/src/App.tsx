import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/layout";
import { NotFoundPage } from "./pages/NotFoundPage";
import { clientRoutes } from "./routes";

/**
 * Client-side SPA shell. Used only on `renderMode: "client"` routes (and in
 * dev), where the app boots in the browser and can navigate between client
 * routes without full reloads. Static pages never load this — they are served
 * as prerendered HTML (with islands hydrating individually).
 */
export function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {clientRoutes.map((route) => (
            <Route key={route.path} path={route.path} element={route.render()} />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
