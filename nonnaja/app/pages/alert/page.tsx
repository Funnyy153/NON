import Navbar from "../../components/Navbar";

export default function AlertPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
        <main className="flex min-h-screen w-full max-w-[95vw] flex-col items-center py-4 px-2 bg-white">
          <div className="w-full">
            <h1 className="text-3xl font-bold mb-6 text-center text-black dark:text-zinc-50">
              Incident Alert
            </h1>
            {/* เพิ่มเนื้อหาของหน้า alert ตรงนี้ */}
          </div>
        </main>
      </div>
    </>
  );
}
