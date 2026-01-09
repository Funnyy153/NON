import Navbar from "../../components/Navbar";
import SheetData3 from "../../components/SheetData3";
export default function AlertPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans pt-20 sm:pt-24">
        <main className="flex min-h-screen w-full max-w-[95vw] flex-col items-center py-4 px-2 bg-white">
          <div className="w-full mt-6">
          <SheetData3 />
            {/* เพิ่มเนื้อหาของหน้า alert ตรงนี้ */}
          </div>
        </main>
      </div>
    </>
  );
}
