"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
// src/App.tsx
const react_router_dom_1 = require("react-router-dom");
const authStore_1 = require("./store/authStore");
const Layout_1 = __importDefault(require("./components/Layout"));
const LoginPage_1 = __importDefault(require("./pages/LoginPage"));
const DashboardPage_1 = __importDefault(require("./pages/DashboardPage"));
const BookingsPage_1 = __importDefault(require("./pages/BookingsPage"));
const BookingDetailPage_1 = __importDefault(require("./pages/BookingDetailPage"));
const DriversPage_1 = __importDefault(require("./pages/DriversPage"));
const DriverDetailPage_1 = __importDefault(require("./pages/DriverDetailPage"));
const PassengersPage_1 = __importDefault(require("./pages/PassengersPage"));
const PricingPage_1 = __importDefault(require("./pages/PricingPage"));
const PaymentsPage_1 = __importDefault(require("./pages/PaymentsPage"));
const PromotionsPage_1 = __importDefault(require("./pages/PromotionsPage"));
const SupportPage_1 = __importDefault(require("./pages/SupportPage"));
const SettingsPage_1 = __importDefault(require("./pages/SettingsPage"));
function ProtectedRoute({ children }) {
    const isAuthenticated = (0, authStore_1.useAuthStore)((s) => s.isAuthenticated);
    return isAuthenticated ? <>{children}</> : <react_router_dom_1.Navigate to="/login" replace/>;
}
function App() {
    return (<react_router_dom_1.BrowserRouter>
      <react_router_dom_1.Routes>
        <react_router_dom_1.Route path="/login" element={<LoginPage_1.default />}/>
        <react_router_dom_1.Route path="/" element={<ProtectedRoute><Layout_1.default /></ProtectedRoute>}>
          <react_router_dom_1.Route index element={<react_router_dom_1.Navigate to="/dashboard" replace/>}/>
          <react_router_dom_1.Route path="dashboard" element={<DashboardPage_1.default />}/>
          <react_router_dom_1.Route path="bookings" element={<BookingsPage_1.default />}/>
          <react_router_dom_1.Route path="bookings/:id" element={<BookingDetailPage_1.default />}/>
          <react_router_dom_1.Route path="drivers" element={<DriversPage_1.default />}/>
          <react_router_dom_1.Route path="drivers/:id" element={<DriverDetailPage_1.default />}/>
          <react_router_dom_1.Route path="passengers" element={<PassengersPage_1.default />}/>
          <react_router_dom_1.Route path="pricing" element={<PricingPage_1.default />}/>
          <react_router_dom_1.Route path="payments" element={<PaymentsPage_1.default />}/>
          <react_router_dom_1.Route path="promotions" element={<PromotionsPage_1.default />}/>
          <react_router_dom_1.Route path="support" element={<SupportPage_1.default />}/>
          <react_router_dom_1.Route path="settings" element={<SettingsPage_1.default />}/>
        </react_router_dom_1.Route>
        <react_router_dom_1.Route path="*" element={<react_router_dom_1.Navigate to="/dashboard" replace/>}/>
      </react_router_dom_1.Routes>
    </react_router_dom_1.BrowserRouter>);
}
//# sourceMappingURL=App.js.map