import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@/App.css";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import { EventsList, ClassesList, ArtistsList } from "@/pages/Discovery";
import { EventDetail, ClassDetail, ArtistDetail } from "@/pages/Detail";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";
import About from "@/pages/About";
import Pricing from "@/pages/Pricing";
import { PaymentSuccess, PaymentCancel } from "@/pages/Payment";
import { SubscriptionSuccess, SubscriptionCancel } from "@/pages/Subscription";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar/>
        <Routes>
          <Route path="/" element={<Landing/>} />
          <Route path="/events" element={<EventsList/>} />
          <Route path="/events/:id" element={<EventDetail/>} />
          <Route path="/classes" element={<ClassesList/>} />
          <Route path="/classes/:id" element={<ClassDetail/>} />
          <Route path="/artists" element={<ArtistsList/>} />
          <Route path="/artists/:id" element={<ArtistDetail/>} />
          <Route path="/auth" element={<Auth/>} />
          <Route path="/dashboard" element={<Dashboard/>} />
          <Route path="/admin" element={<Admin/>} />
          <Route path="/about" element={<About/>} />
          <Route path="/pricing" element={<Pricing/>} />
          <Route path="/payment/success" element={<PaymentSuccess/>} />
          <Route path="/payment/cancel" element={<PaymentCancel/>} />
          <Route path="/subscription/success" element={<SubscriptionSuccess/>} />
          <Route path="/subscription/cancel" element={<SubscriptionCancel/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
