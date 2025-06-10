import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20",
});

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Create a Stripe Connect Express account
        const account = await stripe.accounts.create({
            type: "express",
            email,
            capabilities: {
                transfers: { requested: true },
            },
        });

        // TODO: Save account.id to your DB, associated with the provider's user record
        // Example: await db.providers.update({ email }, { stripeAccountId: account.id })

        // Create an onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: process.env.NEXT_PUBLIC_BASE_URL + "/become-provider?refresh=true",
            return_url: process.env.NEXT_PUBLIC_BASE_URL + "/become-provider?success=true",
            type: "account_onboarding",
        });

        // Return the onboarding link and account ID
        return NextResponse.json({ accountId: account.id, url: accountLink.url });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create Stripe Connect account" }, { status: 500 });
    }
}
