import PluginInit from "@/helper/PluginInit";
import "./font.css";
import "./globals.css";
export const metadata = {
  title: "Travel App",
  description:
    "Developed by anohim.com",
};
export default function RootLayout({ children }) {
  return (
    <html lang='en'>
            <PluginInit />
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
