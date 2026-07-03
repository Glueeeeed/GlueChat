import * as React from 'react';
import {Body, Container, Head, Heading, Html, Preview, Section, Tailwind, Text, Hr} from '@react-email/components';


export type OTPEmailProps = {
  code: string;
};
export  default function OTPEmail({ code }:  OTPEmailProps) {
  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                brand: '#7c3aed',
                dark: '#09090b',
                'dark-lighter': '#18181b',
                muted: '#a1a1aa',
              },
            },
          },
        }}
      >
        <Body className="bg-dark font-sans text-white py-10">
          <Container className="max-w-116.25 mx-auto p-5 rounded-2xl border border-white/5 bg-dark-lighter">
            <Section className="mt-4 mb-8 text-center ">
              <Heading className="text-2xl font-pacifico font-bold uppercase tracking-[0.2em] text-white my-0">
                GlueChat
              </Heading>
            </Section>


            <Section>
              <Text>Use the code below to activate the account recovery feature:</Text>

              <Section className="bg-black/20 rounded-xl py-10 text-center">
                <Text className="text-5xl font-mono font-bold tracking-widest text-violet-500">
                  {code}
                </Text>
              </Section>

              <Text className="text-xs text-muted text-center italic">
                The code will expire in 10 minutes.
                Do not share this code with anyone.

              </Text>
            </Section>

            <Hr className="border-white/5 my-8" />

            <Section className="text-center">
              <Text className="text-muted text-xs leading-6 my-0">
                Sent with ❤️ by GlueChat Team
              </Text>
              <Text className="text-muted text-xs leading-6 my-0 mt-1">
                If you didn't request this email, please ignore it.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
