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
exports.default = AppNavigator;
// src/navigation/AppNavigator.tsx
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const native_1 = require("@react-navigation/native");
const native_stack_1 = require("@react-navigation/native-stack");
const bottom_tabs_1 = require("@react-navigation/bottom-tabs");
const vector_icons_1 = require("@expo/vector-icons");
const authStore_1 = require("../store/authStore");
const useSocket_1 = require("../hooks/useSocket");
const theme_1 = require("../constants/theme");
// Screens
const LoginScreen_1 = __importDefault(require("../screens/auth/LoginScreen"));
const HomeScreen_1 = __importDefault(require("../screens/home/HomeScreen"));
const BookingsScreen_1 = __importDefault(require("../screens/bookings/BookingsScreen"));
const ProfileScreen_1 = __importDefault(require("../screens/profile/ProfileScreen"));
const Stack = (0, native_stack_1.createNativeStackNavigator)();
const Tab = (0, bottom_tabs_1.createBottomTabNavigator)();
function TabNavigator() {
    // Start socket connection when authenticated
    (0, useSocket_1.useSocket)();
    return (<Tab.Navigator screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
                backgroundColor: theme_1.Colors.white,
                borderTopColor: theme_1.Colors.border,
                borderTopWidth: 1,
                paddingBottom: 8,
                paddingTop: 6,
                height: 62,
            },
            tabBarActiveTintColor: theme_1.Colors.brand,
            tabBarInactiveTintColor: theme_1.Colors.textMuted,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarIcon: ({ color, size, focused }) => {
                const icons = {
                    Home: { active: 'home', inactive: 'home-outline' },
                    Bookings: { active: 'car', inactive: 'car-outline' },
                    Profile: { active: 'person', inactive: 'person-outline' },
                };
                const icon = icons[route.name];
                return <vector_icons_1.Ionicons name={(focused ? icon.active : icon.inactive)} size={size} color={color}/>;
            },
        })}>
      <Tab.Screen name="Home" component={HomeScreen_1.default} options={{ tabBarLabel: 'Home' }}/>
      <Tab.Screen name="Bookings" component={BookingsScreen_1.default} options={{ tabBarLabel: 'Rides' }}/>
      <Tab.Screen name="Profile" component={ProfileScreen_1.default} options={{ tabBarLabel: 'Profile' }}/>
    </Tab.Navigator>);
}
function AppNavigator() {
    const { isAuthenticated, isLoading, loadFromStorage } = (0, authStore_1.useAuthStore)();
    (0, react_1.useEffect)(() => {
        void loadFromStorage();
    }, []);
    if (isLoading) {
        return (<react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme_1.Colors.dark }}>
        <react_native_1.ActivityIndicator size="large" color={theme_1.Colors.brand}/>
      </react_native_1.View>);
    }
    return (<native_1.NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (<Stack.Screen name="Main" component={TabNavigator}/>) : (<Stack.Screen name="Auth" component={LoginScreen_1.default}/>)}
      </Stack.Navigator>
    </native_1.NavigationContainer>);
}
//# sourceMappingURL=AppNavigator.js.map