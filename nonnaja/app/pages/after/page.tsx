import SheetData2 from "../../components/SheetData2";
import Navbar from "../../components/Navbar";

export default function AfterPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans pt-20 sm:pt-24">
        <main className="flex min-h-screen w-full max-w-[95vw] flex-col items-center py-4 px-2 bg-white">
          <div className="w-full mt-6">
            
            <SheetData2 />
          </div>
        </main>
      </div>
    </>
  );
}
