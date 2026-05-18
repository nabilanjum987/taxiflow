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
// App.tsx — Driver App Root
const react_1 = __importStar(require("react"));
const expo_status_bar_1 = require("expo-status-bar");
const react_native_gesture_handler_1 = require("react-native-gesture-handler");
const react_query_1 = require("@tanstack/react-query");
const Notifications = __importStar(require("expo-notifications"));
const Device = __importStar(require("expo-device"));
const Location = __importStar(require("expo-location"));
const react_native_1 = require("react-native");
const AppNavigator_1 = __importDefault(require("./src/navigation/AppNavigator"));
// Show notifications when app is in foreground — critical for incoming bookings
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});
const queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        mutations: { retry: 0 },
    },
});
async function setupPermissions() {
    if (!Device.isDevice)
        return;
    // Push notifications
    const { status: notifStatus } = await Notifications.getPermissionsAsync();
    if (notifStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
    }
    if (react_native_1.Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('bookings', {
            name: 'New Booking Requests',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 300, 200, 300],
            lightColor: '#f59e0b',
            sound: 'notification.wav',
        });
    }
    // Foreground location — required for GPS broadcasting
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
        react_native_1.Alert.alert('Location Required', 'CityRide Driver needs location access to broadcast your position to passengers.');
        return;
    }
    // Background location — required for GPS during trips when app is backgrounded
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
        react_native_1.Alert.alert('Background Location', 'For the best experience, please allow "Always" location access so passengers can track you during trips.');
    }
}
function App() {
    (0, react_1.useEffect)(() => {
        void setupPermissions();
        // Handle notification taps
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data;
            if (data?.type === 'BOOKING_NEW' && data.bookingId) {
                // Socket handles the incoming booking display — just log for now
                console.log('Notification tapped — incoming booking:', data.bookingId);
            }
        });
        return () => sub.remove();
    }, []);
    return (<react_native_gesture_handler_1.GestureHandlerRootView style={{ flex: 1 }}>
      <react_query_1.QueryClientProvider client={queryClient}>
        <expo_status_bar_1.StatusBar style="light"/>
        <AppNavigator_1.default />
      </react_query_1.QueryClientProvider>
    </react_native_gesture_handler_1.GestureHandlerRootView>);
}
//# sourceMappingURL=App.js.map