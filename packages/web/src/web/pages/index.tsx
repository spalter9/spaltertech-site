import { Nav } from "../components/nav";
import { Hero } from "../components/landing/hero";
import { Manifesto } from "../components/landing/manifesto";
import { Pillars } from "../components/landing/pillars";
import { Authorship } from "../components/landing/authorship";
import { Closing } from "../components/landing/closing";

export default function Index() {
  return (
    <div className="min-h-screen bg-obsidian text-bone">
      <Nav />
      <Hero />
      <Manifesto />
      <Authorship />
      <Pillars />
      <Closing />
    </div>
  );
}
