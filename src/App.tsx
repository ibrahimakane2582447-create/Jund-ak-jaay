/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import PostProduct from "./pages/PostProduct";
import ProductDetails from "./pages/ProductDetails";
import SellerProfile from "./pages/SellerProfile";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Favorites from "./pages/Favorites";
import Notifications from "./pages/Notifications";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="post" element={<PostProduct />} />
            <Route path="edit/:id" element={<PostProduct />} />
            <Route path="product/:id" element={<ProductDetails />} />
            <Route path="seller/:id" element={<SellerProfile />} />
            <Route path="messages" element={<Messages />} />
            <Route path="chat/:userId" element={<Chat />} />
            <Route path="favorites" element={<Favorites />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
