import { redirect } from "next/navigation";

// Legacy posting flow — superseded by /booking.
export default function BookingWizardRedirect() {
  redirect("/booking");
}
