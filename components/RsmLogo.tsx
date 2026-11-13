import Image from "next/image";
import { RSM_BRAND_NAME, RSM_LOGO_URL } from "@/lib/brand";

type RsmLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function RsmLogo({ className, priority }: RsmLogoProps) {
  return (
    <Image
      src={RSM_LOGO_URL}
      alt={RSM_BRAND_NAME}
      width={132}
      height={44}
      className={className}
      priority={priority}
    />
  );
}
