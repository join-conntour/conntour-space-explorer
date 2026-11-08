import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminDashboardPanel } from "./components/AdminDashboardPanel";
import { ExplorerPage } from "./components/ExplorerPage";
import { ExplorerProvider } from "./context/ExplorerContext";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <ExplorerProvider>
              <ExplorerPage />
            </ExplorerProvider>
          }
        />
        <Route path="/admin" element={<AdminDashboardPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
