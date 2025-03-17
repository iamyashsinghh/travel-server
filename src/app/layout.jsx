import { Toaster } from "react-hot-toast";
import "./font.css";
import "./globals.css";
import PluginInit from "@/helper/PluginInit";
import ConditionalMasterLayout from "@/masterLayout/ConditionalMasterLayout";
export const metadata = {
  title: "Irista Cabs",
  description: "Developed by anohim.com",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <PluginInit />
      <body suppressHydrationWarning={true}>
        <Toaster position="top-right" reverseOrder={false} />
        <ConditionalMasterLayout>{children}</ConditionalMasterLayout>
      </body>
    </html>
  );
}
