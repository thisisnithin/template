import { Body, Container, Head, Html, Preview } from "@react-email/components";
import type { ReactNode } from "react";

interface BaseEmailProps {
  children: ReactNode;
  previewText: string;
  subject: string;
}

export function BaseEmail({ subject, previewText, children }: BaseEmailProps) {
  return (
    <Html>
      <Head>
        <title>{subject}</title>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#ffffff", fontFamily: "sans-serif" }}>
        <Container
          style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}
        >
          {children}
        </Container>
      </Body>
    </Html>
  );
}
