import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import ClientOnlyProviders from "@/components/providers/ClientOnlyProviders";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* Client-only providers: cross-tab sync, order recovery, offline banner */}
      <ClientOnlyProviders />
      <Header />
      <CartDrawer />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
