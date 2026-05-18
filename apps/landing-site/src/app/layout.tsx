import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CityRide — Professional Taxi Service',
  description: 'Fast, reliable, and professional taxi service. Book in seconds, track in real-time.',
  keywords: 'taxi, cab, ride, booking, transport',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
