import Dashboard from "../../components/Dashboard";
import Navbar from "../../components/Navbar";

export default function DashboardPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center font-sans pt-20 sm:pt-24 bg-orange-50">
        <main className="flex min-h-screen w-full max-w-[95vw] flex-col items-center py-4 px-2 ">
          <div className="w-full mt-6">
            <Dashboard />
          </div>
        </main>
      </div>
    </>
  );
}
