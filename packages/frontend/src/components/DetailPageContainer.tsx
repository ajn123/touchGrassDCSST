import { ReactNode } from "react";

interface DetailPageContainerProps {
  children: ReactNode;
  className?: string;
}

export default function DetailPageContainer({
  children,
  className = "",
}: DetailPageContainerProps) {
  return (
    <div
      className={`container ${className}`}
      style={{
        marginTop: "2rem",
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "1rem",
        marginBottom: "2rem",
      }}
    >
      {children}
    </div>
  );
}
