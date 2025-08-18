import './globals.css';

export const metadata = {
  title: 'A2A x402 Demo Dashboard',
  description: 'Dashboard for the A2A x402 demo (Polygon Amoy)'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
