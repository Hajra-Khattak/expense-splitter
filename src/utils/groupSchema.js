import { z } from "zod";

export const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR", "INR"];

export const groupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Group name must be at least 2 characters")
    .max(40, "Group name must be 40 characters or less"),
  description: z.string().trim().max(200, "Description must be 200 characters or less"),
  currency: z.enum(CURRENCIES),
});