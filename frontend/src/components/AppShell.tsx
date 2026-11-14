import { Outlet } from "react-router-dom";
import { RequirePet } from "@/components/RequirePet";
import { Sidebar } from "@/components/Sidebar";

/** Sidebar layout for the app pages. Below lg the sidebar becomes a top bar. */
export function AppShell() {
  return (
    <RequirePet>
      {(pet) => (
        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar pet={pet} />
          <main id="main" className="min-w-0 flex-1 px-5 pb-12 pt-7 sm:px-8 lg:px-10 lg:pt-9">
            <Outlet context={pet} />
          </main>
        </div>
      )}
    </RequirePet>
  );
}
