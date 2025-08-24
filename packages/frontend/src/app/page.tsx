import Categories from "@/components/Categories";
import FeaturedEvents from "@/components/FeaturedEvents";
import FeaturedGroups from "@/components/FeaturedGroups";
import HomepageAnalytics from "@/components/HomepageAnalytics";
import HomepageMap from "@/components/HomepageMap";
import SearchBar from "@/components/SearchBar";
import { createEvent, getCategories } from "@/lib/dynamodb-events";
import { revalidatePath } from "next/cache";
import Image from "next/image";

interface Category {
  category: string;
}

async function submitForm(formData: FormData) {
  "use server";

  // Get the image key from form data
  const imageKey = formData.get("imageKey") as string;

  console.log("Form submission with image key:", imageKey);

  const response = await createEvent(formData);
  console.log(response);
  revalidatePath("/");
}

export default async function Home() {
  // This runs on the server during rendering (like useEffect but server-side)

  const categories = await getCategories();

  console.log("categories", categories);
  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 to-black/30 z-10" />
        <Image
          src={"/images/dc-skyline.jpg"}
          alt="DC Events Hero"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="relative z-20 text-center text-white">
          <h1 className="text-6xl font-bold mb-4">
            Discover Things to Do in DC
          </h1>
          <p className="text-xl mb-8">
            Your guide to everything happening in the District
          </p>
          <div className="flex gap-4 justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <FeaturedEvents />

      {/* Featured Groups Section */}
      <FeaturedGroups />

      {/* Homepage Map Section */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <HomepageMap />
      </section>

      <Categories categories={categories as Category[]} />

      {/* Analytics Component */}
      <HomepageAnalytics />

      {/* <RecurringEvent /> */}
    </main>
  );
}
