"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
// App.tsx — Passenger App Root
const react_1 = __importStar(require("react"));
const expo_status_bar_1 = require("expo-status-bar");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_query_1 = require("@tanstack/react-query");
const Notifications = __importStar(require("expo-notifications"));
const Device = __importStar(require("expo-device"));
const react_native_1 = require("react-native");
const AppNavigator_1 = __importDefault(require("./src/navigation/AppNavigator"));
// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        mutations: { retry: 0 },
    },
});
async function registerForPushNotifications() {
    if (!Device.isDevice)
        return null;
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== 'granted')
        return null;
    if (react_native_1.Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('bookings', {
            name: 'Booking Updates',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#f59e0b',
        });
    }
    const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    });
    return token.data;
}
function App() {
    (0, react_1.useEffect)(() => {
        void registerForPushNotifications();
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (data?.bookingId) {
                // Navigate to booking detail — handled via deep link in production
                console.log('Notification tapped for booking:', data.bookingId);
            }
        });
        return () => sub.remove();
    }, []);
    return (<react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <expo_status_bar_1.StatusBar style="auto"/>
        <AppNavigator_1.default />
      </react_query_1.QueryClientProvider>
    </react_native_gesture_handler_1.GestureHandlerRootView>);
}
//# sourceMappingURL=App.js.map