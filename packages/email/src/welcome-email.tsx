import { Button, Heading, Text } from "@react-email/components";
import { BaseEmail } from "./base-email";

interface WelcomeEmailProps {
  appUrl: string;
  name: string;
}

export function WelcomeEmail({ name, appUrl }: WelcomeEmailProps) {
  return (
    <BaseEmail previewText="Welcome aboard" subject="Welcome">
      <Heading as="h1">Welcome, {name}</Heading>
      <Text>Your account is ready. Pick up where you left off any time.</Text>
      <Button href={appUrl}>Open the app</Button>
    </BaseEmail>
  );
}
