export declare const Colors: {
    readonly brand: "#f59e0b";
    readonly brandDark: "#d97706";
    readonly brandLight: "#fef3c7";
    readonly background: "#ffffff";
    readonly surface: "#f9fafb";
    readonly surface2: "#f3f4f6";
    readonly border: "#e5e7eb";
    readonly text: "#111827";
    readonly textSecondary: "#374151";
    readonly textMuted: "#9ca3af";
    readonly success: "#10b981";
    readonly danger: "#ef4444";
    readonly warning: "#f59e0b";
    readonly info: "#3b82f6";
    readonly dark: "#0f172a";
    readonly darkCard: "#1e293b";
    readonly white: "#ffffff";
    readonly black: "#000000";
    readonly overlay: "rgba(0,0,0,0.5)";
    readonly mapPickup: "#10b981";
    readonly mapDropoff: "#ef4444";
    readonly mapDriver: "#f59e0b";
};
export declare const Spacing: {
    readonly xs: 4;
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 20;
    readonly xxl: 24;
    readonly xxxl: 32;
};
export declare const Radius: {
    readonly sm: 8;
    readonly md: 12;
    readonly lg: 16;
    readonly xl: 20;
    readonly xxl: 24;
    readonly full: 999;
};
export declare const Typography: {
    readonly xs: {
        readonly fontSize: 11;
        readonly lineHeight: 16;
    };
    readonly sm: {
        readonly fontSize: 13;
        readonly lineHeight: 18;
    };
    readonly base: {
        readonly fontSize: 15;
        readonly lineHeight: 22;
    };
    readonly md: {
        readonly fontSize: 17;
        readonly lineHeight: 24;
    };
    readonly lg: {
        readonly fontSize: 20;
        readonly lineHeight: 28;
    };
    readonly xl: {
        readonly fontSize: 24;
        readonly lineHeight: 32;
    };
    readonly xxl: {
        readonly fontSize: 30;
        readonly lineHeight: 38;
    };
};
export declare const Shadow: {
    readonly sm: {
        readonly shadowColor: "#000";
        readonly shadowOffset: {
            readonly width: 0;
            readonly height: 1;
        };
        readonly shadowOpacity: 0.05;
        readonly shadowRadius: 4;
        readonly elevation: 2;
    };
    readonly md: {
        readonly shadowColor: "#000";
        readonly shadowOffset: {
            readonly width: 0;
            readonly height: 4;
        };
        readonly shadowOpacity: 0.1;
        readonly shadowRadius: 12;
        readonly elevation: 4;
    };
    readonly lg: {
        readonly shadowColor: "#000";
        readonly shadowOffset: {
            readonly width: 0;
            readonly height: 8;
        };
        readonly shadowOpacity: 0.15;
        readonly shadowRadius: 24;
        readonly elevation: 8;
    };
};
export declare const GlobalStyles: {
    container: {
        flex: number;
        backgroundColor: "#ffffff";
    };
    safeArea: {
        flex: number;
        backgroundColor: "#ffffff";
    };
    row: {
        flexDirection: "row";
        alignItems: "center";
    };
    center: {
        alignItems: "center";
        justifyContent: "center";
    };
    card: {
        shadowColor: "#000";
        shadowOffset: {
            readonly width: 0;
            readonly height: 1;
        };
        shadowOpacity: 0.05;
        shadowRadius: 4;
        elevation: 2;
        backgroundColor: "#ffffff";
        borderRadius: 20;
        padding: 16;
        borderWidth: number;
        borderColor: "#e5e7eb";
    };
    input: {
        backgroundColor: "#f9fafb";
        borderRadius: 16;
        paddingHorizontal: 16;
        paddingVertical: 12;
        fontSize: number;
        color: "#111827";
        borderWidth: number;
        borderColor: "#e5e7eb";
    };
    inputFocused: {
        borderColor: "#f59e0b";
        borderWidth: number;
    };
    btnPrimary: {
        backgroundColor: "#f59e0b";
        borderRadius: 16;
        paddingVertical: number;
        alignItems: "center";
        justifyContent: "center";
        flexDirection: "row";
        gap: number;
    };
    btnSecondary: {
        backgroundColor: "#f3f4f6";
        borderRadius: 16;
        paddingVertical: number;
        alignItems: "center";
        justifyContent: "center";
    };
    btnText: {
        color: "#ffffff";
        fontSize: number;
        fontWeight: "700";
    };
    btnSecondaryText: {
        color: "#374151";
        fontSize: number;
        fontWeight: "600";
    };
    heading: {
        fontSize: number;
        fontWeight: "700";
        color: "#111827";
    };
    subheading: {
        fontSize: number;
        color: "#9ca3af";
    };
    label: {
        fontSize: number;
        color: "#9ca3af";
        fontWeight: "500";
        textTransform: "uppercase";
        letterSpacing: number;
        marginBottom: number;
    };
    badge: {
        paddingHorizontal: number;
        paddingVertical: number;
        borderRadius: 999;
    };
    badgeText: {
        fontSize: number;
        fontWeight: "600";
    };
};
//# sourceMappingURL=theme.d.ts.map