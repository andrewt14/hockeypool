import { getSettings } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  return <SettingsClient settings={await getSettings()} />;
}
