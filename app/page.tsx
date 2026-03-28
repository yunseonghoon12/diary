import DiaryApp from "@/components/diary/DiaryApp";
import { Jua } from "next/font/google";

const jua = Jua({
  weight: "400",
  subsets: ["latin"],
});

export default function Home() {
  return <DiaryApp className={jua.className} />;
}
