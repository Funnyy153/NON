import SheetData from "./components/SheetData";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans ">
      <main className="flex min-h-screen w-full max-w-7xl flex-col items-center py-8 px-4 bg-white ">
        <div className="w-full">
          <h1 className="text-3xl font-bold mb-6 text-center text-black dark:text-zinc-50">
            ข้อมูลจาก Google Sheets
          </h1>
          <SheetData />
        </div>
      </main>
    </div>
  );
}
