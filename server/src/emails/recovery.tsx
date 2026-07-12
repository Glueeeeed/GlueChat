import * as React from 'react';
import {Body, Container, Head, Heading, Html, Preview, Section, Tailwind, Text, Hr} from '@react-email/components';


export type OTPEmailProps = {
    url: string;
    nickname: string;
};
export  default function Recovery({ url , nickname}:  OTPEmailProps) {
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
                            <Text>Hello, {nickname}</Text>
                            <Text>Use the link below to reset your password:</Text>

                            <a target={"_blank"} href={url} className={"italic underline text-xs text-center font-mono font-bold tracking-widest text-violet-500"} >{url}</a>


                            <Text className="text-xs text-muted text-center italic">
                                The link will expire in 10 minutes.
                                Do not share this with anyone.

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
